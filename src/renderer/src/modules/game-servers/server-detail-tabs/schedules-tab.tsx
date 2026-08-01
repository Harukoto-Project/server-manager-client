import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { ConfirmDestructiveDialog } from "@renderer/components/common/confirm-destructive-dialog";
import { Badge } from "@renderer/components/ui/badge";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@renderer/components/ui/dialog";
import { Switch } from "@renderer/components/ui/switch";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import {
	type CreateScheduleInput,
	type GameServerSchedule,
	type ScheduleTaskInput,
	NodeApiError,
	createSchedule,
	createScheduleTask,
	deleteSchedule,
	deleteScheduleTask,
	fetchSchedules,
	updateSchedule,
} from "@renderer/lib/api/game-servers/schedules";
import { useNodesStore } from "@renderer/state/nodes-store";
import { TabPlaceholder } from "../shared";

const inputClassName = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";
const selectClassName = inputClassName;

function formatDateTime(value: string | null): string {
	if (!value) return "—";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "—";
	return date.toLocaleString("ja-JP", { dateStyle: "medium", timeStyle: "short" });
}

function cronExpression(cron: GameServerSchedule["cron"]): string {
	return `${cron.minute} ${cron.hour} ${cron.dayOfMonth} * ${cron.dayOfWeek}`;
}

function taskActionLabel(action: ScheduleTaskInput["action"]): string {
	switch (action) {
		case "command":
			return "コマンド送信";
		case "power":
			return "電源操作";
		case "backup":
			return "バックアップ作成";
		default:
			return action;
	}
}

/** スケジュール(自動タスク)タブ。Pterodactyl Client APIの`schedule.*`権限に対応する */
export function SchedulesTab() {
	const { nodeId, identifier } = useParams<{ nodeId: string; identifier: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();
	const [actionError, setActionError] = useState<string | null>(null);

	const ready = Boolean(node && token && identifier);

	const schedulesQuery = useQuery({
		queryKey: ["game-server-schedules", nodeId, identifier],
		queryFn: () => fetchSchedules(node!, token!, identifier!),
		enabled: ready,
		refetchInterval: 15000,
		retry: 1,
	});

	async function refresh() {
		await queryClient.invalidateQueries({ queryKey: ["game-server-schedules", nodeId, identifier] });
	}

	async function handleCreate(input: CreateScheduleInput) {
		if (!node || !token || !identifier) return;
		try {
			await createSchedule(node, token, identifier, input);
			await refresh();
		} catch (error) {
			throw new Error(error instanceof NodeApiError ? error.message : "スケジュールの作成に失敗しました。");
		}
	}

	async function handleUpdate(scheduleId: number, input: CreateScheduleInput) {
		if (!node || !token || !identifier) return;
		try {
			await updateSchedule(node, token, identifier, scheduleId, input);
			await refresh();
		} catch (error) {
			throw new Error(error instanceof NodeApiError ? error.message : "スケジュールの更新に失敗しました。");
		}
	}

	async function handleDelete(scheduleId: number) {
		if (!node || !token || !identifier) return;
		setActionError(null);
		try {
			await deleteSchedule(node, token, identifier, scheduleId);
			await refresh();
		} catch (error) {
			setActionError(error instanceof NodeApiError ? error.message : "スケジュールの削除に失敗しました。");
		}
	}

	async function handleCreateTask(scheduleId: number, input: ScheduleTaskInput) {
		if (!node || !token || !identifier) return;
		try {
			await createScheduleTask(node, token, identifier, scheduleId, input);
			await refresh();
		} catch (error) {
			throw new Error(error instanceof NodeApiError ? error.message : "タスクの追加に失敗しました。");
		}
	}

	async function handleDeleteTask(scheduleId: number, taskId: number) {
		if (!node || !token || !identifier) return;
		setActionError(null);
		try {
			await deleteScheduleTask(node, token, identifier, scheduleId, taskId);
			await refresh();
		} catch (error) {
			setActionError(error instanceof NodeApiError ? error.message : "タスクの削除に失敗しました。");
		}
	}

	let statusMessage: string | undefined;
	if (!node || !identifier) statusMessage = "サーバー情報を読み込めませんでした。";
	else if (tokenLoading || schedulesQuery.isLoading) statusMessage = "読み込み中...";
	else if (schedulesQuery.isError)
		statusMessage =
			schedulesQuery.error instanceof NodeApiError ? schedulesQuery.error.message : "スケジュールの取得に失敗しました。";
	else if (ready && schedulesQuery.data?.length === 0) statusMessage = "登録されているスケジュールはありません。";

	if (!ready && !statusMessage) {
		return <TabPlaceholder title="接続情報を取得できません" description="ノードへの接続情報を確認してください。" />;
	}

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
			<div className="flex items-center justify-between gap-3">
				<p className="text-xs text-muted-foreground">
					定期実行スケジュールと、その中で実行するタスク(コマンド送信/電源操作/バックアップ作成)を管理します。
				</p>
				<ScheduleFormDialog
					mode="create"
					trigger={
						<Button size="sm" disabled={!ready}>
							<Plus className="h-4 w-4" /> スケジュールを追加
						</Button>
					}
					onSubmit={handleCreate}
				/>
			</div>

			{statusMessage && <p className="text-sm text-muted-foreground">{statusMessage}</p>}
			{actionError && <p className="text-sm text-destructive">{actionError}</p>}

			<div className="min-h-0 flex-1 overflow-y-auto">
				<div className="space-y-3">
					{schedulesQuery.data?.map((schedule) => (
						<Card key={schedule.id}>
							<CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
								<div className="min-w-0">
									<CardTitle className="flex items-center gap-2 text-sm">
										<CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
										{schedule.name}
									</CardTitle>
									<p className="mt-1 font-mono text-xs text-muted-foreground">{cronExpression(schedule.cron)}</p>
								</div>
								<div className="flex shrink-0 items-center gap-2">
									<Badge variant={schedule.isActive ? "success" : "secondary"}>
										{schedule.isActive ? "有効" : "無効"}
									</Badge>
									{schedule.isProcessing && <Badge variant="outline">実行中</Badge>}
									<ScheduleFormDialog
										mode="edit"
										initial={schedule}
										trigger={
											<Button size="icon" variant="ghost" className="h-8 w-8">
												<Pencil className="h-4 w-4" />
											</Button>
										}
										onSubmit={(input) => handleUpdate(schedule.id, input)}
									/>
									<ConfirmDestructiveDialog
										trigger={
											<Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive">
												<Trash2 className="h-4 w-4" />
											</Button>
										}
										title={`${schedule.name} を削除しますか?`}
										description="このスケジュールに含まれるタスクも全て削除されます。この操作は取り消せません。"
										confirmLabel="削除する"
										onConfirm={() => handleDelete(schedule.id)}
									/>
								</div>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
									<span>前回実行: {formatDateTime(schedule.lastRunAt)}</span>
									<span>次回実行: {formatDateTime(schedule.nextRunAt)}</span>
								</div>

								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<p className="text-xs font-medium text-muted-foreground">タスク</p>
										<TaskFormDialog
											trigger={
												<Button size="sm" variant="outline">
													<Plus className="h-3.5 w-3.5" /> タスクを追加
												</Button>
											}
											onSubmit={(input) => handleCreateTask(schedule.id, input)}
										/>
									</div>
									{schedule.tasks.length === 0 && (
										<p className="text-xs text-muted-foreground">タスクはまだありません。</p>
									)}
									{schedule.tasks.map((task) => (
										<div
											key={task.id}
											className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 text-sm"
										>
											<div className="min-w-0">
												<p className="font-medium">{taskActionLabel(task.action)}</p>
												<p className="truncate font-mono text-xs text-muted-foreground">
													{task.action === "backup" ? "サーバー全体をバックアップ" : task.payload}
													{task.timeOffset > 0 && ` (実行から${task.timeOffset}秒後)`}
												</p>
											</div>
											<ConfirmDestructiveDialog
												trigger={
													<Button size="icon" variant="ghost" className="h-7 w-7">
														<Trash2 className="h-3.5 w-3.5" />
													</Button>
												}
												title="このタスクを削除しますか?"
												description="スケジュール実行時にこのタスクは呼び出されなくなります。"
												confirmLabel="削除する"
												onConfirm={() => handleDeleteTask(schedule.id, task.id)}
											/>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</div>
	);
}

interface ScheduleFormDialogProps {
	mode: "create" | "edit";
	initial?: GameServerSchedule;
	trigger: ReactNode;
	onSubmit: (input: CreateScheduleInput) => Promise<void>;
}

function ScheduleFormDialog({ mode, initial, trigger, onSubmit }: ScheduleFormDialogProps) {
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [name, setName] = useState(initial?.name ?? "");
	const [minute, setMinute] = useState(initial?.cron.minute ?? "*/5");
	const [hour, setHour] = useState(initial?.cron.hour ?? "*");
	const [dayOfWeek, setDayOfWeek] = useState(initial?.cron.dayOfWeek ?? "*");
	const [dayOfMonth, setDayOfMonth] = useState(initial?.cron.dayOfMonth ?? "*");
	const [isActive, setIsActive] = useState(initial?.isActive ?? true);

	function resetForm() {
		setName(initial?.name ?? "");
		setMinute(initial?.cron.minute ?? "*/5");
		setHour(initial?.cron.hour ?? "*");
		setDayOfWeek(initial?.cron.dayOfWeek ?? "*");
		setDayOfMonth(initial?.cron.dayOfMonth ?? "*");
		setIsActive(initial?.isActive ?? true);
		setError(null);
	}

	function handleOpenChange(next: boolean) {
		if (next) resetForm();
		setOpen(next);
	}

	async function handleSubmit() {
		if (!name.trim() || !minute.trim() || !hour.trim() || !dayOfWeek.trim() || !dayOfMonth.trim()) {
			setError("全ての項目を入力してください。");
			return;
		}
		setPending(true);
		setError(null);
		try {
			await onSubmit({
				name: name.trim(),
				minute: minute.trim(),
				hour: hour.trim(),
				dayOfWeek: dayOfWeek.trim(),
				dayOfMonth: dayOfMonth.trim(),
				isActive,
			});
			setOpen(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : "スケジュールの保存に失敗しました。");
		} finally {
			setPending(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{mode === "create" ? "スケジュールを追加" : "スケジュールを編集"}</DialogTitle>
					<DialogDescription>
						cron形式に近い指定(分/時/曜日/日)で定期実行のタイミングを設定します。「*」は「毎回」を意味します。
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="schedule-name">
							名前
						</label>
						<input
							id="schedule-name"
							autoFocus
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="日次バックアップ"
							className={inputClassName}
						/>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1">
							<label className="text-xs font-medium text-muted-foreground" htmlFor="schedule-minute">
								分
							</label>
							<input
								id="schedule-minute"
								value={minute}
								onChange={(e) => setMinute(e.target.value)}
								placeholder="*/5"
								className={`${inputClassName} font-mono`}
							/>
						</div>
						<div className="space-y-1">
							<label className="text-xs font-medium text-muted-foreground" htmlFor="schedule-hour">
								時
							</label>
							<input
								id="schedule-hour"
								value={hour}
								onChange={(e) => setHour(e.target.value)}
								placeholder="*"
								className={`${inputClassName} font-mono`}
							/>
						</div>
						<div className="space-y-1">
							<label className="text-xs font-medium text-muted-foreground" htmlFor="schedule-dow">
								曜日
							</label>
							<input
								id="schedule-dow"
								value={dayOfWeek}
								onChange={(e) => setDayOfWeek(e.target.value)}
								placeholder="*"
								className={`${inputClassName} font-mono`}
							/>
						</div>
						<div className="space-y-1">
							<label className="text-xs font-medium text-muted-foreground" htmlFor="schedule-dom">
								日
							</label>
							<input
								id="schedule-dom"
								value={dayOfMonth}
								onChange={(e) => setDayOfMonth(e.target.value)}
								placeholder="*"
								className={`${inputClassName} font-mono`}
							/>
						</div>
					</div>

					<div className="flex items-center justify-between rounded-lg border bg-card p-3">
						<div>
							<p className="text-sm font-medium">有効</p>
							<p className="text-xs text-muted-foreground">無効にすると自動実行を一時停止します</p>
						</div>
						<Switch checked={isActive} onCheckedChange={setIsActive} />
					</div>

					{error && <p className="text-sm text-destructive">{error}</p>}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)}>
						キャンセル
					</Button>
					<Button disabled={pending} onClick={handleSubmit}>
						{pending ? "保存中..." : mode === "create" ? "作成する" : "保存する"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

interface TaskFormDialogProps {
	trigger: ReactNode;
	onSubmit: (input: ScheduleTaskInput) => Promise<void>;
}

const POWER_SIGNAL_OPTIONS = [
	{ value: "start", label: "起動" },
	{ value: "stop", label: "停止" },
	{ value: "restart", label: "再起動" },
	{ value: "kill", label: "強制終了" },
];

function TaskFormDialog({ trigger, onSubmit }: TaskFormDialogProps) {
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [action, setAction] = useState<ScheduleTaskInput["action"]>("command");
	const [command, setCommand] = useState("");
	const [powerSignal, setPowerSignal] = useState("restart");
	const [timeOffset, setTimeOffset] = useState("0");

	function resetForm() {
		setAction("command");
		setCommand("");
		setPowerSignal("restart");
		setTimeOffset("0");
		setError(null);
	}

	function handleOpenChange(next: boolean) {
		if (next) resetForm();
		setOpen(next);
	}

	async function handleSubmit() {
		const offset = Number(timeOffset);
		if (!Number.isFinite(offset) || offset < 0) {
			setError("実行遅延は0以上の数値で指定してください。");
			return;
		}
		if (action === "command" && !command.trim()) {
			setError("実行するコマンドを入力してください。");
			return;
		}
		setPending(true);
		setError(null);
		try {
			const payload = action === "command" ? command.trim() : action === "power" ? powerSignal : "backup";
			await onSubmit({ action, payload, timeOffset: Math.round(offset) });
			setOpen(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : "タスクの保存に失敗しました。");
		} finally {
			setPending(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>タスクを追加</DialogTitle>
					<DialogDescription>スケジュール発火時に実行する処理を追加します。</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="task-action">
							種別
						</label>
						<select
							id="task-action"
							value={action}
							onChange={(e) => setAction(e.target.value as ScheduleTaskInput["action"])}
							className={selectClassName}
						>
							<option value="command">コマンド送信</option>
							<option value="power">電源操作</option>
							<option value="backup">バックアップ作成</option>
						</select>
					</div>

					{action === "command" && (
						<div className="space-y-1">
							<label className="text-xs font-medium text-muted-foreground" htmlFor="task-command">
								コマンド
							</label>
							<input
								id="task-command"
								autoFocus
								value={command}
								onChange={(e) => setCommand(e.target.value)}
								placeholder="say サーバーは間もなく再起動します"
								className={`${inputClassName} font-mono`}
							/>
						</div>
					)}

					{action === "power" && (
						<div className="space-y-1">
							<label className="text-xs font-medium text-muted-foreground" htmlFor="task-power">
								電源操作
							</label>
							<select
								id="task-power"
								value={powerSignal}
								onChange={(e) => setPowerSignal(e.target.value)}
								className={selectClassName}
							>
								{POWER_SIGNAL_OPTIONS.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</div>
					)}

					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="task-time-offset">
							実行遅延(秒)
						</label>
						<input
							id="task-time-offset"
							type="number"
							min={0}
							value={timeOffset}
							onChange={(e) => setTimeOffset(e.target.value)}
							className={inputClassName}
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
