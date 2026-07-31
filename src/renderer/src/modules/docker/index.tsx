import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Container, HardDrive, Network, Play, RotateCw, Square } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { ConfirmDestructiveDialog } from "@renderer/components/common/confirm-destructive-dialog";
import { ConsoleLogViewer } from "@renderer/components/common/console-log-viewer";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Badge } from "@renderer/components/ui/badge";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@renderer/components/ui/tabs";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import {
	type DockerContainer,
	type DockerContainerAction,
	dockerContainerAction,
	fetchDockerContainerLogs,
	fetchDockerContainers,
	fetchDockerImages,
	fetchDockerNetworks,
	fetchDockerVolumes,
	NodeApiError,
} from "@renderer/lib/node-api-client";
import { formatBytes } from "@renderer/lib/utils";
import type { ModuleDefinition } from "@renderer/modules/types";
import { useNodesStore } from "@renderer/state/nodes-store";

function containerDisplayName(container: DockerContainer): string {
	return container.names[0]?.replace(/^\//, "") ?? container.id.slice(0, 12);
}

function ContainerStateBadge({ state }: { state: string }) {
	if (state === "running") return <Badge variant="success">起動中</Badge>;
	if (state === "paused") return <Badge variant="secondary">一時停止</Badge>;
	return <Badge variant="secondary">停止中</Badge>;
}

function DockerPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();

	const [activeTab, setActiveTab] = useState("containers");
	const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
	const [pendingAction, setPendingAction] = useState<string | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);

	const ready = Boolean(node && token);

	const containersQuery = useQuery({
		queryKey: ["docker-containers", nodeId],
		queryFn: () => fetchDockerContainers(node!, token!),
		enabled: ready,
		refetchInterval: 5000,
		retry: 1,
	});

	const imagesQuery = useQuery({
		queryKey: ["docker-images", nodeId],
		queryFn: () => fetchDockerImages(node!, token!),
		enabled: ready && activeTab === "images",
		retry: 1,
	});

	const volumesQuery = useQuery({
		queryKey: ["docker-volumes", nodeId],
		queryFn: () => fetchDockerVolumes(node!, token!),
		enabled: ready && activeTab === "volumes",
		retry: 1,
	});

	const networksQuery = useQuery({
		queryKey: ["docker-networks", nodeId],
		queryFn: () => fetchDockerNetworks(node!, token!),
		enabled: ready && activeTab === "networks",
		retry: 1,
	});

	const selectedContainer = containersQuery.data?.find((c) => c.id === selectedContainerId) ?? null;

	const logsQuery = useQuery({
		queryKey: ["docker-container-logs", nodeId, selectedContainerId],
		queryFn: () => fetchDockerContainerLogs(node!, token!, selectedContainerId as string),
		enabled: ready && Boolean(selectedContainerId),
		refetchInterval: 4000,
		retry: 1,
	});

	async function runAction(container: DockerContainer, action: DockerContainerAction) {
		if (!node || !token) return;
		setActionError(null);
		setPendingAction(`${container.id}:${action}`);
		try {
			await dockerContainerAction(node, token, container.id, action);
			await queryClient.invalidateQueries({ queryKey: ["docker-containers", nodeId] });
		} catch (error) {
			setActionError(error instanceof NodeApiError ? error.message : "操作に失敗しました。");
		} finally {
			setPendingAction(null);
		}
	}

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || containersQuery.isLoading) statusMessage = "接続中...";
	else if (containersQuery.isError)
		statusMessage =
			containersQuery.error instanceof NodeApiError
				? containersQuery.error.message
				: "ノードに接続できませんでした。";

	return (
		<DashboardPageLayout
			title="Docker"
			description="コンテナ・イメージ・ボリューム・ネットワークをタブで管理します。"
			inspector={
				selectedContainer ? (
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">コンソール: {containerDisplayName(selectedContainer)}</CardTitle>
						</CardHeader>
						<CardContent>
							<ConsoleLogViewer
								lines={logsQuery.data ?? []}
								emptyLabel={logsQuery.isLoading ? "ログを取得中..." : "ログはまだありません"}
							/>
						</CardContent>
					</Card>
				) : undefined
			}
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}
			{actionError && <p className="mb-4 text-sm text-destructive">{actionError}</p>}

			<Tabs value={activeTab} onValueChange={setActiveTab}>
				<TabsList>
					<TabsTrigger value="containers">コンテナ</TabsTrigger>
					<TabsTrigger value="images">イメージ</TabsTrigger>
					<TabsTrigger value="volumes">ボリューム</TabsTrigger>
					<TabsTrigger value="networks">ネットワーク</TabsTrigger>
				</TabsList>

				<TabsContent value="containers" className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
					{ready && !containersQuery.isLoading && containersQuery.data?.length === 0 && (
						<p className="text-sm text-muted-foreground">コンテナが見つかりませんでした。</p>
					)}
					{containersQuery.data?.map((container) => {
						const name = containerDisplayName(container);
						const isRunning = container.state === "running";
						return (
							<Card
								key={container.id}
								className={container.id === selectedContainerId ? "cursor-pointer ring-2 ring-primary" : "cursor-pointer"}
								onClick={() => setSelectedContainerId(container.id)}
							>
								<CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
									<CardTitle className="flex items-center gap-2 truncate text-sm font-medium">
										<Container className="h-4 w-4 shrink-0 text-muted-foreground" />
										<span className="truncate">{name}</span>
									</CardTitle>
									<ContainerStateBadge state={container.state} />
								</CardHeader>
								<CardContent className="flex items-center justify-between gap-2">
									<span className="truncate text-xs text-muted-foreground">{container.image}</span>
									<div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
										<Button
											size="icon"
											variant="ghost"
											title="起動"
											disabled={isRunning || pendingAction === `${container.id}:start`}
											onClick={() => runAction(container, "start")}
										>
											<Play className="h-4 w-4" />
										</Button>
										<Button
											size="icon"
											variant="ghost"
											title="再起動"
											disabled={pendingAction === `${container.id}:restart`}
											onClick={() => runAction(container, "restart")}
										>
											<RotateCw className="h-4 w-4" />
										</Button>
										<ConfirmDestructiveDialog
											trigger={
												<Button size="icon" variant="ghost" title="停止" disabled={!isRunning}>
													<Square className="h-4 w-4" />
												</Button>
											}
											title={`${name} を停止しますか?`}
											description="コンテナを停止すると、接続中のプレイヤー・クライアントは切断されます。"
											confirmLabel="停止する"
											onConfirm={() => runAction(container, "stop")}
										/>
									</div>
								</CardContent>
							</Card>
						);
					})}
				</TabsContent>

				<TabsContent value="images" className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
					{imagesQuery.isLoading && <p className="text-sm text-muted-foreground">読み込み中...</p>}
					{imagesQuery.data?.length === 0 && (
						<p className="text-sm text-muted-foreground">イメージが見つかりませんでした。</p>
					)}
					{imagesQuery.data?.map((image) => (
						<Card key={image.id}>
							<CardHeader className="pb-2">
								<CardTitle className="truncate text-sm font-medium">
									{image.tags?.[0] ?? image.id.replace("sha256:", "").slice(0, 12)}
								</CardTitle>
							</CardHeader>
							<CardContent className="text-xs text-muted-foreground">{formatBytes(image.sizeBytes)}</CardContent>
						</Card>
					))}
				</TabsContent>

				<TabsContent value="volumes" className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
					{volumesQuery.isLoading && <p className="text-sm text-muted-foreground">読み込み中...</p>}
					{volumesQuery.data?.length === 0 && (
						<p className="text-sm text-muted-foreground">ボリュームが見つかりませんでした。</p>
					)}
					{volumesQuery.data?.map((volume) => (
						<Card key={volume.name}>
							<CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
								<HardDrive className="h-4 w-4 text-muted-foreground" />
								<CardTitle className="truncate text-sm font-medium">{volume.name}</CardTitle>
							</CardHeader>
							<CardContent className="space-y-1 text-xs text-muted-foreground">
								<p>ドライバ: {volume.driver}</p>
								<p className="truncate">{volume.mountpoint}</p>
							</CardContent>
						</Card>
					))}
				</TabsContent>

				<TabsContent value="networks" className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
					{networksQuery.isLoading && <p className="text-sm text-muted-foreground">読み込み中...</p>}
					{networksQuery.data?.length === 0 && (
						<p className="text-sm text-muted-foreground">ネットワークが見つかりませんでした。</p>
					)}
					{networksQuery.data?.map((net) => (
						<Card key={net.id}>
							<CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
								<Network className="h-4 w-4 text-muted-foreground" />
								<CardTitle className="truncate text-sm font-medium">{net.name}</CardTitle>
							</CardHeader>
							<CardContent className="text-xs text-muted-foreground">
								ドライバ: {net.driver} / スコープ: {net.scope}
							</CardContent>
						</Card>
					))}
				</TabsContent>
			</Tabs>
		</DashboardPageLayout>
	);
}

export const dockerModule: ModuleDefinition = {
	id: "docker",
	label: "Docker",
	icon: Container,
	group: "operations",
	order: 10,
	element: DockerPage,
};
