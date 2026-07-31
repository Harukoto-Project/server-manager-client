import { useQuery } from "@tanstack/react-query";
import { Network as NetworkIcon, Plug, Router } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DetailField } from "@renderer/components/common/detail-field";
import { EntityList, EntityListItem } from "@renderer/components/common/entity-list";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Card, CardContent } from "@renderer/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@renderer/components/ui/tabs";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import {
	NodeApiError,
	fetchNetworkConnections,
	fetchNetworkDns,
	fetchNetworkInterfaces,
	fetchNetworkRoutes,
} from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";
import { ConnectionStateBadge, OperStateBadge } from "./shared";

export function NetworkListPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const navigate = useNavigate();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);

	const [activeTab, setActiveTab] = useState("interfaces");
	const ready = Boolean(node && token);

	const interfacesQuery = useQuery({
		queryKey: ["network-interfaces", nodeId],
		queryFn: () => fetchNetworkInterfaces(node!, token!),
		enabled: ready,
		refetchInterval: 10000,
		retry: 1,
	});

	const routesQuery = useQuery({
		queryKey: ["network-routes", nodeId],
		queryFn: () => fetchNetworkRoutes(node!, token!),
		enabled: ready && activeTab === "routing",
		retry: 1,
	});

	const dnsQuery = useQuery({
		queryKey: ["network-dns", nodeId],
		queryFn: () => fetchNetworkDns(node!, token!),
		enabled: ready && activeTab === "routing",
		retry: 1,
	});

	const connectionsQuery = useQuery({
		queryKey: ["network-connections", nodeId],
		queryFn: () => fetchNetworkConnections(node!, token!),
		enabled: ready && activeTab === "connections",
		refetchInterval: 8000,
		retry: 1,
	});

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || interfacesQuery.isLoading) statusMessage = "接続中...";
	else if (interfacesQuery.isError)
		statusMessage =
			interfacesQuery.error instanceof NodeApiError
				? interfacesQuery.error.message
				: "ノードに接続できませんでした。";

	return (
		<DashboardPageLayout
			title="ネットワーク"
			description="インターフェース・ルーティング/DNS・アクティブな接続を確認できます。行をクリックするとインターフェースの詳細ページに移動します。"
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}

			<Tabs value={activeTab} onValueChange={setActiveTab}>
				<TabsList>
					<TabsTrigger value="interfaces">インターフェース</TabsTrigger>
					<TabsTrigger value="routing">ルーティング / DNS</TabsTrigger>
					<TabsTrigger value="connections">アクティブな接続</TabsTrigger>
				</TabsList>

				<TabsContent value="interfaces">
					{ready && !interfacesQuery.isLoading && interfacesQuery.data?.length === 0 && (
						<p className="text-sm text-muted-foreground">インターフェースが見つかりませんでした。</p>
					)}
					{interfacesQuery.data && interfacesQuery.data.length > 0 && (
						<EntityList>
							{interfacesQuery.data.map((iface) => (
								<EntityListItem
									key={iface.name}
									icon={NetworkIcon}
									title={iface.displayName || iface.name}
									subtitle={iface.ip4 ? `${iface.ip4}${iface.ip4subnet ? `/${iface.ip4subnet}` : ""}` : "IPv4未割当"}
									meta={`${iface.type || "-"}${iface.isDefault ? " ・ デフォルト" : ""}`}
									badge={<OperStateBadge operstate={iface.operstate} />}
									onClick={() => navigate(`interfaces/${encodeURIComponent(iface.name)}`)}
								/>
							))}
						</EntityList>
					)}
				</TabsContent>

				<TabsContent value="routing" className="space-y-4">
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<DetailField label="デフォルトゲートウェイ" value={routesQuery.data?.gateway || "取得中..."} />
						<DetailField
							label="DNSサーバー"
							value={
								dnsQuery.data && dnsQuery.data.nameservers.length > 0
									? dnsQuery.data.nameservers.join(", ")
									: "取得中、または未設定です"
							}
						/>
					</div>
					<Card>
						<CardContent className="py-4">
							<p className="mb-2 flex items-center gap-2 text-sm font-medium">
								<Router className="h-4 w-4 text-muted-foreground" /> ルーティングテーブル
							</p>
							{routesQuery.isLoading && <p className="text-sm text-muted-foreground">読み込み中...</p>}
							{routesQuery.data?.routes.length === 0 && (
								<p className="text-sm text-muted-foreground">ルート情報が見つかりませんでした。</p>
							)}
							<div className="space-y-1 font-mono text-xs">
								{routesQuery.data?.routes.map((route) => (
									<div key={route} className="rounded bg-muted px-2 py-1">
										{route}
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="connections">
					{connectionsQuery.isLoading && <p className="text-sm text-muted-foreground">読み込み中...</p>}
					{connectionsQuery.data && connectionsQuery.data.connections.length === 0 && (
						<p className="text-sm text-muted-foreground">アクティブな接続が見つかりませんでした。</p>
					)}
					{connectionsQuery.data && connectionsQuery.data.connections.length > 0 && (
						<>
							<p className="mb-2 text-xs text-muted-foreground">
								全{connectionsQuery.data.total}件中 {connectionsQuery.data.connections.length}件を表示
							</p>
							<EntityList>
								{connectionsQuery.data.connections.map((conn, index) => (
									<EntityListItem
										// biome-ignore lint: 接続情報は安定した識別子を持たないためindexを含めたキーを許容
										key={`${conn.protocol}-${conn.localAddress}-${conn.localPort}-${index}`}
										icon={Plug}
										title={`${conn.protocol.toUpperCase()} ${conn.localAddress}:${conn.localPort}`}
										subtitle={
											conn.peerAddress && conn.peerAddress !== "0.0.0.0" && conn.peerAddress !== "*"
												? `→ ${conn.peerAddress}:${conn.peerPort}`
												: undefined
										}
										meta={conn.process ? `${conn.process} (pid ${conn.pid})` : `pid ${conn.pid}`}
										badge={<ConnectionStateBadge state={conn.state} />}
									/>
								))}
							</EntityList>
						</>
					)}
				</TabsContent>
			</Tabs>
		</DashboardPageLayout>
	);
}
