import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, RotateCw, Square, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ConfirmDestructiveDialog } from "@renderer/components/common/confirm-destructive-dialog";
import { ConsoleLogViewer } from "@renderer/components/common/console-log-viewer";
import { DetailField } from "@renderer/components/common/detail-field";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import { useProcessManagerConsole } from "@renderer/hooks/use-process-manager-console";
import {
	type ProcessManagerAction,
	NodeApiError,
	fetchProcessManagerProjects,
	processManagerProjectAction,
	removeProcessManagerProject,
} from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";
import { ProjectStatusBadge } from "./shared";

export function ProjectDetailPage() {
	const { nodeId, projectId } = useParams<{ nodeId: string; projectId: string }>();
	const navigate = useNavigate();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();

	const [pendingAction, setPendingAction] = useState<ProcessManagerAction | "remove" | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);

	const ready = Boolean(node && token);

	const projectsQuery = useQuery({
		queryKey: ["process-manager-projects", nodeId],
		queryFn: () => fetchProcessManagerProjects(node!, token!),
		enabled: ready,
		refetchInterval: 5000,
		retry: 1,
	});

	const project = projectsQuery.data?.find((p) => p.id === projectId);
	const { lines } = useProcessManagerConsole(node, token ?? undefined, projectId);

	async function runAction(action: ProcessManagerAction) {
		if (!node || !token || !projectId) return;
		setActionError(null);
		setPendingAction(action);
		try {
			await processManagerProjectAction(node, token, projectId, action);
			await queryClient.invalidateQueries({ queryKey: ["process-manager-projects", nodeId] });
		} catch (error) {
			setActionError(error instanceof NodeApiError ? error.message : "操作に失敗しました。");
		} finally {
			setPendingAction(null);
		}
	}

	async function runRemove() {
		if (!node || !token || !projectId) return;
		setActionError(null);
		setPendingAction("remove");
		try {
			await removeProcessManagerProject(node, token, projectId);
			await queryClient.invalidateQueries({ queryKey: ["process-manager-projects", nodeId] });
			navigate(`/nodes/${nodeId}/process-manager`);
		} catch (error) {
			setActionError(error instanceof NodeApiError ? error.message : "削除に失敗しました。");
		} finally {
			setPendingAction(null);
		}
	}

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || projectsQuery.isLoading) statusMessage = "接続中...";
	else if (projectsQuery.isError)
		statusMessage =
			projectsQuery.error instanceof NodeApiError ? projectsQuery.error.message : "ノードに接続できませんでした。";
	else if (!project) statusMessage = "プロジェクトが見つかりませんでした。一覧から選び直してください。";

	const isRunning = project?.status === "running";

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/process-manager`}
			backLabel="プロジェクト一覧に戻る"
			title={project?.name ?? "プロジェクト"}
			description={project?.command}
			actions={
				project && (
					<>
						<Button
							size="sm"
							variant="outline"
							disabled={isRunning || pendingAction === "start"}
							onClick={() => runAction("start")}
						>
							<Play className="h-4 w-4" /> 起動
						</Button>
						<Button size="sm" variant="outline" disabled={pendingAction === "restart"} onClick={() => runAction("restart")}>
							<RotateCw className="h-4 w-4" /> 再起動
						</Button>
						<ConfirmDestructiveDialog
							trigger={
								<Button size="sm" variant="destructive" disabled={!isRunning}>
									<Square className="h-4 w-4" /> 停止
								</Button>
							}
							title={`${project.name} を停止しますか?`}
							description="プロセスを停止すると、実行中の処理は中断されます。"
							confirmLabel="停止する"
							onConfirm={() => runAction("stop")}
						/>
						<ConfirmDestructiveDialog
							trigger={
								<Button size="sm" variant="destructive">
									<Trash2 className="h-4 w-4" /> 削除
								</Button>
							}
							title={`${project.name} を削除しますか?`}
							description="実行中の場合は停止した上でプロジェクト定義を削除します。この操作は取り消せません。"
							confirmLabel="削除する"
							onConfirm={runRemove}
						/>
					</>
				)
			}
			inspector={
				project ? (
					<>
						<DetailField label="状態" value={<ProjectStatusBadge status={project.status} />} />
						<DetailField label="種別" value={project.kind} />
						<DetailField label="自動起動" value={project.autoStart ? "有効" : "無効"} />
						<DetailField label="作業ディレクトリ" value={<span className="break-all font-mono text-xs">{project.cwd}</span>} />
						<DetailField
							label="起動コマンド"
							value={
								<span className="break-all font-mono text-xs">
									{project.command} {project.args.join(" ")}
								</span>
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
						lines={lines}
						emptyLabel={ready ? "ログはまだありません" : "ノードに接続するとログが流れます"}
					/>
				</CardContent>
			</Card>
		</DashboardPageLayout>
	);
}
