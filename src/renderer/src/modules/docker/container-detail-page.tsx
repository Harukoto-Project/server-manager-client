import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Play, RotateCw, Square } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { ConfirmDestructiveDialog } from "@renderer/components/common/confirm-destructive-dialog";
import { ConsoleLogViewer } from "@renderer/components/common/console-log-viewer";
import { DetailField } from "@renderer/components/common/detail-field";
import { EditLabelDialog } from "@renderer/components/common/edit-label-dialog";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { useContainerLabels } from "@renderer/hooks/use-container-labels";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import {
	type DockerContainerAction,
	NodeApiError,
	dockerContainerAction,
	fetchDockerContainerLogs,
	fetchDockerContainers,
} from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";
import { ContainerStateBadge, containerDisplayName, containerRealName } from "./shared";

export function ContainerDetailPage() {
	const { nodeId, containerId } = useParams<{ nodeId: string; containerId: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();

	const [pendingAction, setPendingAction] = useState<DockerContainerAction | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);
	const { labels, setLabel } = useContainerLabels(nodeId);

	const ready = Boolean(node && token);

	const containersQuery = useQuery({
		queryKey: ["docker-containers", nodeId],
		queryFn: () => fetchDockerContainers(node!, token!),
		enabled: ready,
		refetchInterval: 5000,
		retry: 1,
	});

	const container = containersQuery.data?.find((c) => c.id === containerId);

	const logsQuery = useQuery({
		queryKey: ["docker-container-logs", nodeId, containerId],
		queryFn: () => fetchDockerContainerLogs(node!, token!, containerId as string),
		enabled: ready && Boolean(containerId),
		refetchInterval: 4000,
		retry: 1,
	});

	async function runAction(action: DockerContainerAction) {
		if (!node || !token || !containerId) return;
		setActionError(null);
		setPendingAction(action);
		try {
			await dockerContainerAction(node, token, containerId, action);
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
	else if (!container) statusMessage = "コンテナが見つかりませんでした。一覧から選び直してください。";

	const isRunning = container?.state === "running";
	const label = containerId ? labels[containerId] : undefined;
	const name = container ? containerDisplayName(container, label) : (containerId ?? "コンテナ");

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/docker`}
			backLabel="コンテナ一覧に戻る"
			title={name}
			description={
				container && (label ? `${containerRealName(container)} ・ ${container.image}` : container.image)
			}
			actions={
				container && (
					<>
						<EditLabelDialog
							trigger={
								<Button size="sm" variant="outline">
									<Pencil className="h-4 w-4" /> 表示名を編集
								</Button>
							}
							title="表示名を編集"
							description="実際のコンテナ名は変更せず、このアプリ上での表示名のみを変更します。空欄で保存すると元の名前に戻ります。"
							initialValue={label ?? ""}
							placeholder={containerRealName(container)}
							onSave={(value) => setLabel(container.id, value)}
						/>
						<Button
							size="sm"
							variant="outline"
							disabled={isRunning || pendingAction === "start"}
							onClick={() => runAction("start")}
						>
							<Play className="h-4 w-4" /> 起動
						</Button>
						<Button
							size="sm"
							variant="outline"
							disabled={pendingAction === "restart"}
							onClick={() => runAction("restart")}
						>
							<RotateCw className="h-4 w-4" /> 再起動
						</Button>
						<ConfirmDestructiveDialog
							trigger={
								<Button size="sm" variant="destructive" disabled={!isRunning}>
									<Square className="h-4 w-4" /> 停止
								</Button>
							}
							title={`${name} を停止しますか?`}
							description="コンテナを停止すると、接続中のプレイヤー・クライアントは切断されます。"
							confirmLabel="停止する"
							onConfirm={() => runAction("stop")}
						/>
					</>
				)
			}
			inspector={
				container ? (
					<>
						<DetailField label="状態" value={<ContainerStateBadge state={container.state} />} />
						<DetailField label="ステータス" value={container.status} />
						<DetailField label="イメージ" value={container.image} />
						{label && <DetailField label="実際のコンテナ名" value={containerRealName(container)} />}
						<DetailField label="コンテナID" value={<span className="break-all font-mono text-xs">{container.id}</span>} />
						<DetailField
							label="ポート"
							value={
								container.ports.length > 0 ? (
									<div className="space-y-0.5">
										{container.ports.map((port, index) => (
											// biome-ignore lint: ポート情報は安定した識別子を持たないためindexキーを許容
											<div key={index} className="font-mono text-xs">
												{port.IP ?? "0.0.0.0"}:{port.PublicPort ?? "-"} → {port.PrivatePort}/{port.Type}
											</div>
										))}
									</div>
								) : (
									"公開ポートなし"
								)
							}
						/>
					</>
				) : (
					<p className="text-sm text-muted-foreground">情報を読み込み中です...</p>
				)
			}
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}
			{actionError && <p className="mb-4 text-sm text-destructive">{actionError}</p>}

			<Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
				<CardHeader>
					<CardTitle className="text-sm">コンソール</CardTitle>
				</CardHeader>
				<CardContent className="flex min-h-0 flex-1 flex-col pb-6">
					<ConsoleLogViewer
						fillHeight
						className="h-full"
						lines={logsQuery.data ?? []}
						emptyLabel={logsQuery.isLoading ? "ログを取得中..." : "ログはまだありません"}
					/>
				</CardContent>
			</Card>
		</DashboardPageLayout>
	);
}
