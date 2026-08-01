import { useQuery } from "@tanstack/react-query";
import { Server, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { EntityList, EntityListItem } from "@renderer/components/common/entity-list";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Badge } from "@renderer/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import {
	fetchPterodactylNodeConfiguration,
	fetchPterodactylNodes,
	type PterodactylNode,
} from "@renderer/lib/api/game-servers/nodes";
import { NodeApiError } from "@renderer/lib/node-api-client";
import { formatBytes } from "@renderer/lib/utils";
import { useNodesStore } from "@renderer/state/nodes-store";

function usagePercent(used: number, total: number): number {
	if (total <= 0) return 0;
	return Math.min(100, Math.round((used / total) * 1000) / 10);
}

function UsageBar({ label, usedMb, totalMb }: { label: string; usedMb: number; totalMb: number }) {
	const percent = usagePercent(usedMb, totalMb);
	return (
		<div className="space-y-1">
			<div className="flex items-center justify-between text-xs text-muted-foreground">
				<span>{label}</span>
				<span>
					{formatBytes(usedMb * 1024 * 1024)} / {formatBytes(totalMb * 1024 * 1024)}({percent}%)
				</span>
			</div>
			<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
				<div
					className="h-full rounded-full bg-primary transition-all"
					style={{ width: `${Math.max(percent, percent > 0 ? 2 : 0)}%` }}
				/>
			</div>
		</div>
	);
}

interface NodeInspectorProps {
	node: PterodactylNode;
	appNode: ReturnType<typeof useNodesStore.getState>["nodes"][number] | undefined;
	token: string | null | undefined;
}

function NodeInspector({ node, appNode, token }: NodeInspectorProps) {
	const configQuery = useQuery({
		queryKey: ["game-servers-admin-node-configuration", appNode?.id, node.id],
		queryFn: () => fetchPterodactylNodeConfiguration(appNode!, token!, node.id),
		enabled: Boolean(appNode && token),
		retry: 1,
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-sm">
					<Server className="h-4 w-4" /> {node.name}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-1 text-xs text-muted-foreground">
					<p>
						FQDN: <span className="font-mono text-foreground">{node.fqdn}</span>
					</p>
					<p>
						スキーム: <span className="font-mono text-foreground">{node.scheme}</span>
					</p>
					<p>
						UUID: <span className="font-mono text-foreground">{node.uuid}</span>
					</p>
				</div>

				<UsageBar label="メモリ" usedMb={node.allocatedMemory} totalMb={node.memory} />
				<UsageBar label="ディスク" usedMb={node.allocatedDisk} totalMb={node.disk} />

				{node.isMaintenanceMode && (
					<div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-2 text-xs text-amber-600 dark:text-amber-400">
						<ShieldAlert className="h-4 w-4 shrink-0" />
						このノードは現在メンテナンスモードです。
					</div>
				)}

				<div className="border-t pt-3">
					<p className="mb-2 text-xs font-medium text-muted-foreground">wings設定情報</p>
					{configQuery.isLoading && <p className="text-xs text-muted-foreground">読み込み中...</p>}
					{configQuery.isError && (
						<p className="text-xs text-destructive">
							{configQuery.error instanceof NodeApiError
								? configQuery.error.message
								: "設定情報を取得できませんでした。"}
						</p>
					)}
					{configQuery.data && (
						<div className="space-y-1 text-xs text-muted-foreground">
							<p>
								API待受: <span className="font-mono text-foreground">{configQuery.data.api.host}:{configQuery.data.api.port}</span>
							</p>
							<p>
								SSL: <span className="text-foreground">{configQuery.data.api.ssl.enabled ? "有効" : "無効"}</span>
							</p>
							<p>
								SFTPポート: <span className="font-mono text-foreground">{configQuery.data.system.sftpBindPort}</span>
							</p>
							<p>
								データディレクトリ: <span className="font-mono text-foreground">{configQuery.data.system.dataDirectory}</span>
							</p>
							<p>
								接続先パネル: <span className="font-mono text-foreground">{configQuery.data.remote}</span>
							</p>
							<p className="pt-1 text-[11px] text-muted-foreground/70">
								セキュリティ上の理由から、デーモン起動トークン本体は表示していません。
							</p>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

/** ノード管理ページ。Pterodactylパネルに登録されたWingsノードの一覧・設定確認を行う(閲覧専用) */
export function NodesPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const [selectedId, setSelectedId] = useState<number | null>(null);

	const ready = Boolean(node && token);

	const nodesQuery = useQuery({
		queryKey: ["game-servers-admin-nodes", nodeId],
		queryFn: () => fetchPterodactylNodes(node!, token!),
		enabled: ready,
		retry: 1,
	});

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || nodesQuery.isLoading) statusMessage = "接続中...";
	else if (nodesQuery.isError)
		statusMessage =
			nodesQuery.error instanceof NodeApiError ? nodesQuery.error.message : "ノードに接続できませんでした。";
	else if (ready && nodesQuery.data?.length === 0) statusMessage = "登録済みのPterodactylノードはありません。";

	const selectedNode = nodesQuery.data?.find((n) => n.id === selectedId);

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/game-servers/admin`}
			backLabel="管理者機能一覧に戻る"
			title="ノード管理"
			description="サーバーが配置されているPterodactylノードの一覧と設定を確認します(閲覧専用)。"
			inspector={selectedNode ? <NodeInspector node={selectedNode} appNode={node} token={token} /> : undefined}
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}

			{nodesQuery.data && nodesQuery.data.length > 0 && (
				<EntityList>
					{nodesQuery.data.map((n) => (
						<EntityListItem
							key={n.id}
							icon={Server}
							title={n.name}
							subtitle={<span className="font-mono">{n.fqdn}</span>}
							meta={`メモリ ${usagePercent(n.allocatedMemory, n.memory)}% / ディスク ${usagePercent(n.allocatedDisk, n.disk)}%`}
							onClick={() => setSelectedId(n.id === selectedId ? null : n.id)}
							badge={n.isMaintenanceMode ? <Badge variant="secondary">メンテナンス中</Badge> : undefined}
						/>
					))}
				</EntityList>
			)}
		</DashboardPageLayout>
	);
}
