import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Timer, Trash2 } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { ConfirmDestructiveDialog } from "@renderer/components/common/confirm-destructive-dialog";
import { EntityList, EntityListItem } from "@renderer/components/common/entity-list";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Button } from "@renderer/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@renderer/components/ui/dialog";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import { createCronJob, deleteCronJob, fetchCronJobs } from "@renderer/lib/api/system-settings/scheduled-tasks";
import { NodeApiError } from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";

const inputClassName = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";

interface AddCronJobDialogProps {
	trigger: React.ReactNode;
	onAdd: (schedule: string, command: string) => Promise<void>;
}

function AddCronJobDialog({ trigger, onAdd }: AddCronJobDialogProps) {
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [schedule, setSchedule] = useState("");
	const [command, setCommand] = useState("");

	function resetForm() {
		setSchedule("");
		setCommand("");
		setError(null);
	}

	function handleOpenChange(next: boolean) {
		if (next) resetForm();
		setOpen(next);
	}

	async function handleSubmit() {
		if (!schedule.trim() || !command.trim()) {
			setError("スケジュールとコマンドは必須です。");
			return;
		}
		setPending(true);
		setError(null);
		try {
			await onAdd(schedule.trim(), command.trim());
			setOpen(false);
		} catch (err) {
			setError(err instanceof NodeApiError ? err.message : "タスクの追加に失敗しました。");
		} finally {
			setPending(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>定期実行タスクを追加</DialogTitle>
					<DialogDescription>
						cron形式(分 時 日 月 曜日)でスケジュールを指定し、実行するコマンドを設定します。rootユーザーのcrontabに追記されます。
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="cron-schedule">
							スケジュール(分 時 日 月 曜日)
						</label>
						<input
							id="cron-schedule"
							autoFocus
							value={schedule}
							onChange={(e) => setSchedule(e.target.value)}
							placeholder="0 3 * * *"
							className={`${inputClassName} font-mono`}
						/>
					</div>

					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="cron-command">
							コマンド
						</label>
						<input
							id="cron-command"
							value={command}
							onChange={(e) => setCommand(e.target.value)}
							placeholder="/usr/local/bin/backup.sh"
							className={`${inputClassName} font-mono`}
						/>
					</div>

					{error && <p className="text-sm text-destructive">{error}</p>}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)}>
						キャンセル
					</Button>
					<Button disabled={pending} onClick={handleSubmit}>
						{pending ? "追加中..." : "追加する"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function ScheduledTasksPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();

	const [actionError, setActionError] = useState<string | null>(null);

	const ready = Boolean(node && token);

	const jobsQuery = useQuery({
		queryKey: ["system-settings-scheduled-tasks-cron-jobs", nodeId],
		queryFn: () => fetchCronJobs(node!, token!),
		enabled: ready,
		retry: 1,
	});

	async function refresh() {
		await queryClient.invalidateQueries({ queryKey: ["system-settings-scheduled-tasks-cron-jobs", nodeId] });
	}

	async function handleAdd(schedule: string, command: string) {
		if (!node || !token) return;
		await createCronJob(node, token, { schedule, command });
		await refresh();
	}

	async function handleDelete(index: number) {
		if (!node || !token) return;
		setActionError(null);
		try {
			await deleteCronJob(node, token, index);
			await refresh();
		} catch (error) {
			setActionError(error instanceof NodeApiError ? error.message : "タスクの削除に失敗しました。");
		}
	}

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || jobsQuery.isLoading) statusMessage = "接続中...";
	else if (jobsQuery.isError)
		statusMessage = jobsQuery.error instanceof NodeApiError ? jobsQuery.error.message : "ノードに接続できませんでした。";
	else if (ready && jobsQuery.data?.length === 0) statusMessage = "登録されている定期実行タスクはありません。";

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/system-settings`}
			backLabel="設定一覧に戻る"
			title="定期実行タスク"
			description="rootユーザーのcrontabに登録されている定期実行タスクを確認・追加・削除します。"
			actions={
				<AddCronJobDialog
					trigger={
						<Button size="sm" disabled={!ready}>
							<Plus className="h-4 w-4" /> タスクを追加
						</Button>
					}
					onAdd={handleAdd}
				/>
			}
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}
			{actionError && <p className="mb-4 text-sm text-destructive">{actionError}</p>}

			{jobsQuery.data && jobsQuery.data.length > 0 && (
				<EntityList>
					{jobsQuery.data.map((job) => (
						<EntityListItem
							key={job.index}
							icon={Timer}
							title={job.command}
							subtitle={<span className="font-mono">{job.schedule}</span>}
							badge={
								<ConfirmDestructiveDialog
									trigger={
										<Button size="icon" variant="ghost" className="h-7 w-7">
											<Trash2 className="h-3.5 w-3.5" />
										</Button>
									}
									title="この定期実行タスクを削除しますか?"
									description={`「${job.schedule} ${job.command}」を削除します。この操作は元に戻せません。`}
									confirmLabel="削除する"
									onConfirm={() => handleDelete(job.index)}
								/>
							}
						/>
					))}
				</EntityList>
			)}
		</DashboardPageLayout>
	);
}
