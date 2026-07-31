import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Gamepad2, Play, RotateCw, Square } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { ConfirmDestructiveDialog } from "@renderer/components/common/confirm-destructive-dialog";
import { ConsoleLogViewer } from "@renderer/components/common/console-log-viewer";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Badge } from "@renderer/components/ui/badge";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import {
	type GameServer,
	type GameServerPowerSignal,
	NodeApiError,
	fetchGameServers,
	gameServerPowerAction,
} from "@renderer/lib/node-api-client";
import type { ModuleDefinition } from "@renderer/modules/types";
import { useNodesStore } from "@renderer/state/nodes-store";

function ServerStateBadge({ server }: { server: GameServer }) {
	if (server.status && server.status !== "installing") {
		// installing以外のApplication API状態(suspended等)は電源状態より優先して表示する
		return <Badge variant="secondary">{server.status}</Badge>;
	}
	switch (server.currentState) {
		case "running":
			return <Badge variant="success">稼働中</Badge>;
		case "starting":
			return <Badge variant="secondary">起動中...</Badge>;
		case "stopping":
			return <Badge variant="secondary">停止処理中...</Badge>;
		case "offline":
			return <Badge variant="secondary">停止中</Badge>;
		default:
			return <Badge variant="outline">状態不明</Badge>;
	}
}

function GameServersPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();

	const [selectedIdentifier, setSelectedIdentifier] = useState<string | null>(null);
	const [pendingAction, setPendingAction] = useState<string | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);

	const ready = Boolean(node && token);

	const serversQuery = useQuery({
		queryKey: ["game-servers", nodeId],
		queryFn: () => fetchGameServers(node!, token!),
		enabled: ready,
		refetchInterval: 10000,
		retry: 1,
	});

	const selectedServer = serversQuery.data?.find((s) => s.identifier === selectedIdentifier) ?? null;

	async function runPowerAction(server: GameServer, signal: GameServerPowerSignal) {
		if (!node || !token) return;
		setActionError(null);
		setPendingAction(`${server.identifier}:${signal}`);
		try {
			await gameServerPowerAction(node, token, server.identifier, signal);
			// Pterodactyl側の状態遷移(starting/stopping)が反映されるまで少し待ってから再取得する
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

	return (
		<DashboardPageLayout
			title="Minecraft / ゲームサーバー"
			description="既存Pterodactylパネルの Application/Client API 経由でサーバーを管理します(自前デザインのGUI)。"
			inspector={
				selectedServer ? (
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">コンソール: {selectedServer.name}</CardTitle>
						</CardHeader>
						<CardContent>
							<ConsoleLogViewer
								lines={[]}
								emptyLabel="リアルタイムコンソール(Wings WebSocket接続)は今後の実装予定です"
							/>
						</CardContent>
					</Card>
				) : undefined
			}
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}
			{actionError && <p className="mb-4 text-sm text-destructive">{actionError}</p>}

			{ready && !serversQuery.isLoading && serversQuery.data?.length === 0 && (
				<Card>
					<CardContent className="py-6 text-sm text-muted-foreground">
						Pterodactylパネルにサーバーが見つかりませんでした。
					</CardContent>
				</Card>
			)}

			<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
				{serversQuery.data?.map((server) => {
					const isRunning = server.currentState === "running" || server.currentState === "starting";
					const isTransitioning = server.currentState === "starting" || server.currentState === "stopping";
					return (
						<Card
							key={server.identifier}
							className={
								server.identifier === selectedIdentifier ? "cursor-pointer ring-2 ring-primary" : "cursor-pointer"
							}
							onClick={() => setSelectedIdentifier(server.identifier)}
						>
							<CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="flex items-center gap-2 truncate text-sm font-medium">
									<Gamepad2 className="h-4 w-4 shrink-0 text-muted-foreground" />
									<span className="truncate">{server.name}</span>
								</CardTitle>
								<ServerStateBadge server={server} />
							</CardHeader>
							<CardContent className="flex items-center justify-between gap-2">
								<span className="truncate text-xs text-muted-foreground">#{server.identifier}</span>
								<div
									className="flex shrink-0 gap-1"
									onClick={(e) => e.stopPropagation()}
									onKeyDown={(e) => e.stopPropagation()}
								>
									<Button
										size="icon"
										variant="ghost"
										title="起動"
										disabled={isRunning || isTransitioning || pendingAction === `${server.identifier}:start`}
										onClick={() => runPowerAction(server, "start")}
									>
										<Play className="h-4 w-4" />
									</Button>
									<Button
										size="icon"
										variant="ghost"
										title="再起動"
										disabled={isTransitioning || pendingAction === `${server.identifier}:restart`}
										onClick={() => runPowerAction(server, "restart")}
									>
										<RotateCw className="h-4 w-4" />
									</Button>
									<ConfirmDestructiveDialog
										trigger={
											<Button size="icon" variant="ghost" title="停止" disabled={!isRunning || isTransitioning}>
												<Square className="h-4 w-4" />
											</Button>
										}
										title={`${server.name} を停止しますか?`}
										description="プレイヤーが接続中の場合は強制的に切断されます。"
										confirmLabel="停止する"
										onConfirm={() => runPowerAction(server, "stop")}
									/>
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>
		</DashboardPageLayout>
	);
}

export const gameServersModule: ModuleDefinition = {
	id: "game-servers",
	label: "ゲームサーバー",
	icon: Gamepad2,
	group: "games",
	order: 40,
	element: GameServersPage,
};
