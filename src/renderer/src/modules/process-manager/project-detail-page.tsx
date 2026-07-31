import { Play, RotateCw, Square } from "lucide-react";
import { useParams } from "react-router-dom";
import { ConfirmDestructiveDialog } from "@renderer/components/common/confirm-destructive-dialog";
import { ConsoleLogViewer } from "@renderer/components/common/console-log-viewer";
import { DetailField } from "@renderer/components/common/detail-field";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Badge } from "@renderer/components/ui/badge";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { placeholderProjects } from "./placeholder-data";

export function ProjectDetailPage() {
	const { nodeId, projectId } = useParams<{ nodeId: string; projectId: string }>();
	const project = placeholderProjects.find((p) => p.id === projectId);
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
						<Button size="sm" variant="outline" disabled={isRunning}>
							<Play className="h-4 w-4" /> 起動
						</Button>
						<Button size="sm" variant="outline">
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
							onConfirm={() => {
								/* TODO: POST /process-manager/projects/:id/stop 接続後に実装 */
							}}
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
							emptyLabel="WebSocket /process-manager/projects/:id/console 接続後にログが流れます"
						/>
					</CardContent>
				</Card>
			}
		>
			{!project && <p className="mb-4 text-sm text-muted-foreground">プロジェクトが見つかりませんでした。</p>}

			{project && (
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
					<DetailField
						label="状態"
						value={<Badge variant={isRunning ? "success" : "secondary"}>{isRunning ? "稼働中" : "停止中"}</Badge>}
					/>
					<DetailField label="種別" value={project.kind} />
					<DetailField label="作業ディレクトリ" value={<span className="font-mono text-xs">{project.cwd}</span>} />
					<DetailField label="起動コマンド" value={<span className="font-mono text-xs">{project.command}</span>} />
				</div>
			)}
		</DashboardPageLayout>
	);
}
