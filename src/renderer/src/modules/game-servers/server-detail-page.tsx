import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, RotateCw, Square } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { ConfirmDestructiveDialog } from "@renderer/components/common/confirm-destructive-dialog";
import { ConsoleLogViewer } from "@renderer/components/common/console-log-viewer";
import { DetailField } from "@renderer/components/common/detail-field";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import {
	type GameServerPowerSignal,
	NodeApiError,
	fetchGameServers,
	gameServerPowerAction,
} from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";
import { ServerStateBadge } from "./shared";

export function ServerDetailPage() {
	const { nodeId, identifier } = useParams<{ nodeId: string; identifier: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();

	const [pendingAction, setPendingAction] = useState<GameServerPowerSignal | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);

	const ready = Boolean(node && token);

	const serversQuery = useQuery({
		queryKey: ["game-servers", nodeId],
		queryFn: () => fetchGameServers(node!, token!),
		enabled: ready,
		refetchInterval: 10000,
		retry: 1,
	});

	const server = serversQuery.data?.find((s) => s.identifier === identifier);

	async function runPowerAction(signal: GameServerPowerSignal) {
		if (!node || !token || !identifier) return;
		setActionError(null);
		setPendingAction(signal);
		try {
			await gameServerPowerAction(node, token, identifier, signal);
			setTimeout(() => {
				void queryClient.invalidateQueries({ queryKey: ["game-servers", nodeId] });
			}, 1500);
		} catch (error) {
			setActionError(error instanceof NodeApiError ? error.message : "操作に失敗しました。");
		} finally {
			setPendingAction(null);
		}
	}

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || serversQuery.isLoading) statusMessage = "接続中...";
	else if (serversQuery.isError)
		statusMessage =
			serversQuery.error instanceof NodeApiError
				? serversQuery.error.message
				: "Pterodactylパネルに接続できませんでした。";
	else if (!server) statusMessage = "サーバーが見つかりませんでした。一覧から選び直してください。";

	const isRunning = server?.currentState === "running" || server?.currentState === "starting";
	const isTransitioning = server?.currentState === "starting" || server?.currentState === "stopping";

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/game-servers`}
			backLabel="サーバー一覧に戻る"
			title={server?.name ?? "ゲームサーバー"}
			description={server?.description || undefined}
			actions={
				server && (
					<>
						<Button
							size="sm"
							variant="outline"
							disabled={isRunning || isTransitioning || pendingAction === "start"}
							onClick={() => runPowerAction("start")}
						>
							<Play className="h-4 w-4" /> 起動
						</Button>
						<Button
							size="sm"
							variant="outline"
							disabled={isTransitioning || pendingAction === "restart"}
							onClick={() => runPowerAction("restart")}
						>
							<RotateCw className="h-4 w-4" /> 再起動
						</Button>
						<ConfirmDestructiveDialog
							trigger={
								<Button size="sm" variant="destructive" disabled={!isRunning || isTransitioning}>
									<Square className="h-4 w-4" /> 停止
								</Button>
							}
							title={`${server.name} を停止しますか?`}
							description="プレイヤーが接続中の場合は強制的に切断されます。"
							confirmLabel="停止する"
							onConfirm={() => runPowerAction("stop")}
						/>
					</>
				)
			}
			inspector={
				<Card>
					<CardHeader>
						<CardTitle className="text-sm">コンソール</CardTitle>
					</CardHeader>
					<CardContent>
						<ConsoleLogViewer
							lines={[]}
							emptyLabel="リアルタイムコンソール(Wings WebSocket接続)は今後の実装予定です"
						/>
					</CardContent>
				</Card>
			}
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}
			{actionError && <p className="mb-4 text-sm text-destructive">{actionError}</p>}

			{server && (
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
					<DetailField label="状態" value={<ServerStateBadge server={server} />} />
					<DetailField label="識別子" value={<span className="font-mono text-xs">{server.identifier}</span>} />
					<DetailField label="メモリ上限" value={server.limits.memory > 0 ? `${server.limits.memory} MB` : "無制限"} />
					<DetailField label="ディスク上限" value={server.limits.disk > 0 ? `${server.limits.disk} MB` : "無制限"} />
					<DetailField label="CPU上限" value={server.limits.cpu > 0 ? `${server.limits.cpu}%` : "無制限"} />
					<DetailField label="UUID" value={<span className="font-mono text-xs">{server.uuid}</span>} />
				</div>
			)}
		</DashboardPageLayout>
	);
}
