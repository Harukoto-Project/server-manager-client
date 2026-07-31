import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Clock, Plus, Power, X } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { ConfirmDestructiveDialog } from "@renderer/components/common/confirm-destructive-dialog";
import { EntityList, EntityListItem } from "@renderer/components/common/entity-list";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Badge } from "@renderer/components/ui/badge";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent } from "@renderer/components/ui/card";
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
import {
	type PowerScheduleAction,
	cancelPowerSchedule,
	createPowerSchedule,
	fetchPowerSchedule,
} from "@renderer/lib/api/system-settings/power-schedule";
import { NodeApiError } from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";

const inputClassName = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";

function defaultLocalDatetime(): string {
	const date = new Date(Date.now() + 10 * 60_000);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface CreateScheduleDialogProps {
	trigger: React.ReactNode;
	onCreate: (action: PowerScheduleAction, time: string) => Promise<void>;
}

function CreateScheduleDialog({ trigger, onCreate }: CreateScheduleDialogProps) {
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [action, setAction] = useState<PowerScheduleAction>("reboot");
	const [localDatetime, setLocalDatetime] = useState(defaultLocalDatetime());

	function handleOpenChange(next: boolean) {
		if (next) {
			setAction("reboot");
			setLocalDatetime(defaultLocalDatetime());
			setError(null);
		}
		setOpen(next);
	}

	async function handleConfirm() {
		if (!localDatetime) {
			setError("予約する日時を指定してください。");
			return;
		}
		const parsedDate = new Date(localDatetime);
		if (Number.isNaN(parsedDate.getTime())) {
			setError("日時の形式が正しくありません。");
			return;
		}
		setPending(true);
		setError(null);
		try {
			await onCreate(action, parsedDate.toISOString());
			setOpen(false);
		} catch (err) {
			setError(err instanceof NodeApiError ? err.message : "予約の登録に失敗しました。");
		} finally {
			setPending(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>再起動 / シャットダウンを予約</DialogTitle>
					<DialogDescription>指定した日時に再起動またはシャットダウンを自動実行します。</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					<div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
						<div className="flex items-start gap-2">
							<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
							<p className="text-xs text-muted-foreground">
								指定した時刻になると、確認なしで再起動またはシャットダウンが実行され、進行中の作業が中断されます。予約前に他の利用者への影響を確認してください。
							</p>
						</div>
					</div>

					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="power-action">
							操作
						</label>
						<select
							id="power-action"
							value={action}
							onChange={(e) => setAction(e.target.value as PowerScheduleAction)}
							className={inputClassName}
						>
							<option value="reboot">再起動(reboot)</option>
							<option value="shutdown">シャットダウン(shutdown)</option>
						</select>
					</div>

					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="power-time">
							予約日時
						</label>
						<input
							id="power-time"
							type="datetime-local"
							value={localDatetime}
							onChange={(e) => setLocalDatetime(e.target.value)}
							className={inputClassName}
						/>
					</div>

					{error && <p className="text-sm text-destructive">{error}</p>}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)}>
						キャンセル
					</Button>
					<ConfirmDestructiveDialog
						trigger={<Button disabled={pending}>{pending ? "予約中..." : "予約する"}</Button>}
						title={`本当に${action === "reboot" ? "再起動" : "シャットダウン"}を予約しますか?`}
						description="指定した時刻に再起動またはシャットダウンが今すぐ実行され、進行中の作業が中断されます。この予約は取り消すまで有効です。"
						confirmLabel="予約する"
						onConfirm={handleConfirm}
					/>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function PowerSchedulePage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();

	const [actionError, setActionError] = useState<string | null>(null);

	const ready = Boolean(node && token);

	const scheduleQuery = useQuery({
		queryKey: ["system-settings-power-schedule", nodeId],
		queryFn: () => fetchPowerSchedule(node!, token!),
		enabled: ready,
		refetchInterval: 15000,
		retry: 1,
	});

	async function refresh() {
		await queryClient.invalidateQueries({ queryKey: ["system-settings-power-schedule", nodeId] });
	}

	async function handleCreate(action: PowerScheduleAction, time: string) {
		if (!node || !token) return;
		await createPowerSchedule(node, token, { action, time });
		await refresh();
	}

	async function handleCancel() {
		if (!node || !token) return;
		setActionError(null);
		try {
			await cancelPowerSchedule(node, token);
			await refresh();
		} catch (error) {
			setActionError(error instanceof NodeApiError ? error.message : "予約の取り消しに失敗しました。");
		}
	}

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || scheduleQuery.isLoading) statusMessage = "接続中...";
	else if (scheduleQuery.isError)
		statusMessage =
			scheduleQuery.error instanceof NodeApiError ? scheduleQuery.error.message : "ノードに接続できませんでした。";
	else if (ready && scheduleQuery.data?.length === 0) statusMessage = "予約されている再起動/シャットダウンはありません。";

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/system-settings`}
			backLabel="設定一覧に戻る"
			title="電源管理・再起動スケジュール"
			description="サーバーの再起動・シャットダウンの予約を確認・作成・取り消しします。"
			actions={
				<CreateScheduleDialog
					trigger={
						<Button size="sm" disabled={!ready}>
							<Plus className="h-4 w-4" /> 予約を追加
						</Button>
					}
					onCreate={handleCreate}
				/>
			}
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}
			{actionError && <p className="mb-4 text-sm text-destructive">{actionError}</p>}

			<Card className="mb-4 border-destructive/40 bg-destructive/5">
				<CardContent className="flex items-start gap-3 py-4">
					<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
					<p className="text-xs text-muted-foreground">
						予約時刻になると、確認なしで再起動またはシャットダウンが実行され、進行中の作業が中断されます。取り消す場合は忘れずに「予約を取り消す」を実行してください。
					</p>
				</CardContent>
			</Card>

			{scheduleQuery.data && scheduleQuery.data.length > 0 && (
				<>
					<EntityList className="mb-4">
						{scheduleQuery.data.map((job) => (
							<EntityListItem
								key={job.jobId}
								icon={job.action === "reboot" ? Power : Clock}
								title={
									job.action === "reboot"
										? "再起動の予約"
										: job.action === "shutdown"
											? "シャットダウンの予約"
											: "不明な予約"
								}
								subtitle={<span className="font-mono">{job.time}</span>}
								meta={`job #${job.jobId}`}
								badge={<Badge variant="destructive">{job.action}</Badge>}
							/>
						))}
					</EntityList>

					<ConfirmDestructiveDialog
						trigger={
							<Button size="sm" variant="outline">
								<X className="h-4 w-4" /> 予約を取り消す
							</Button>
						}
						title="再起動/シャットダウンの予約を取り消しますか?"
						description="予約されている全ての再起動/シャットダウンジョブを取り消します。"
						confirmLabel="取り消す"
						onConfirm={handleCancel}
					/>
				</>
			)}
		</DashboardPageLayout>
	);
}
