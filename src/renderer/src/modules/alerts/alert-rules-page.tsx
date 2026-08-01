import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { ConfirmDestructiveDialog } from "@renderer/components/common/confirm-destructive-dialog";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Button } from "@renderer/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@renderer/components/ui/dialog";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import {
	type AlertMetric,
	type AlertRule,
	createAlertRule,
	deleteAlertRule,
	fetchAlertRules,
	updateAlertRule,
} from "@renderer/lib/api/alerts";
import { NodeApiError } from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";

const METRIC_LABEL: Record<AlertMetric, string> = {
	cpu: "CPU使用率",
	memory: "メモリ使用率",
	disk: "ディスク使用率",
};

export function AlertRulesPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();
	const [actionError, setActionError] = useState<string | null>(null);

	const ready = Boolean(node && token);

	const rulesQuery = useQuery({
		queryKey: ["alert-rules", nodeId],
		queryFn: () => fetchAlertRules(node!, token!),
		enabled: ready,
		retry: 1,
	});

	const toggleMutation = useMutation({
		mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
			updateAlertRule(node!, token!, id, { enabled }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alert-rules", nodeId] }),
		onError: (error) =>
			setActionError(error instanceof NodeApiError ? error.message : "ルールの更新に失敗しました。"),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteAlertRule(node!, token!, id),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alert-rules", nodeId] }),
		onError: (error) =>
			setActionError(error instanceof NodeApiError ? error.message : "ルールの削除に失敗しました。"),
	});

	async function handleSave(data: Omit<AlertRule, "id">, editingId?: string) {
		if (!node || !token) return;
		if (editingId) {
			await updateAlertRule(node, token, editingId, data);
		} else {
			await createAlertRule(node, token, data);
		}
		await queryClient.invalidateQueries({ queryKey: ["alert-rules", nodeId] });
	}

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || rulesQuery.isLoading) statusMessage = "接続中...";
	else if (rulesQuery.isError)
		statusMessage =
			rulesQuery.error instanceof NodeApiError ? rulesQuery.error.message : "ノードに接続できませんでした。";
	else if (rulesQuery.data?.length === 0) statusMessage = "アラートルールはまだ設定されていません。";

	return (
		<DashboardPageLayout
			title="アラートルール"
			description="CPU・メモリ・ディスクの使用率が閾値を超えた際に Discord へ通知します。"
			actions={
				<AlertRuleDialog
					trigger={
						<Button size="sm" disabled={!ready}>
							<Plus className="h-4 w-4" /> ルールを追加
						</Button>
					}
					onSave={handleSave}
				/>
			}
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}
			{actionError && <p className="mb-4 text-sm text-destructive">{actionError}</p>}

			{rulesQuery.data && rulesQuery.data.length > 0 && (
				<div className="rounded-md border">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b bg-muted/50">
								<th className="px-4 py-2 text-left font-medium text-muted-foreground">メトリクス</th>
								<th className="px-4 py-2 text-left font-medium text-muted-foreground">閾値</th>
								<th className="px-4 py-2 text-left font-medium text-muted-foreground">冷却時間</th>
								<th className="px-4 py-2 text-left font-medium text-muted-foreground">状態</th>
								<th className="px-4 py-2 text-right font-medium text-muted-foreground">操作</th>
							</tr>
						</thead>
						<tbody>
							{rulesQuery.data.map((rule) => (
								<tr key={rule.id} className="border-b last:border-0">
									<td className="px-4 py-3">
										<div className="flex items-center gap-2">
											<Bell className="h-4 w-4 text-muted-foreground" />
											<span>
												{METRIC_LABEL[rule.metric]}
												{rule.metric === "disk" && rule.diskPath && (
													<span className="ml-1 text-xs text-muted-foreground">({rule.diskPath})</span>
												)}
											</span>
										</div>
									</td>
									<td className="px-4 py-3">{rule.threshold}%</td>
									<td className="px-4 py-3">{rule.cooldownMinutes}分</td>
									<td className="px-4 py-3">
										<button
											type="button"
											role="switch"
											aria-checked={rule.enabled}
											onClick={() => toggleMutation.mutate({ id: rule.id, enabled: !rule.enabled })}
											className={`relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors focus:outline-none ${
												rule.enabled ? "bg-primary" : "bg-input"
											}`}
										>
											<span
												className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
													rule.enabled ? "translate-x-4" : "translate-x-0.5"
												}`}
											/>
										</button>
									</td>
									<td className="px-4 py-3">
										<div className="flex items-center justify-end gap-1">
											<AlertRuleDialog
												trigger={
													<Button size="icon" variant="ghost" className="h-8 w-8">
														<Pencil className="h-4 w-4" />
													</Button>
												}
												initialValues={rule}
												onSave={(data) => handleSave(data, rule.id)}
											/>
											<ConfirmDestructiveDialog
												trigger={
													<Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive">
														<Trash2 className="h-4 w-4" />
													</Button>
												}
												title="このアラートルールを削除しますか?"
												description="削除後は復元できません。"
												confirmLabel="削除する"
												onConfirm={() => deleteMutation.mutate(rule.id)}
											/>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</DashboardPageLayout>
	);
}

interface AlertRuleDialogProps {
	trigger: React.ReactNode;
	initialValues?: AlertRule;
	onSave: (data: Omit<AlertRule, "id">) => Promise<void>;
}

function AlertRuleDialog({ trigger, initialValues, onSave }: AlertRuleDialogProps) {
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [metric, setMetric] = useState<AlertMetric>(initialValues?.metric ?? "cpu");
	const [threshold, setThreshold] = useState(String(initialValues?.threshold ?? 80));
	const [diskPath, setDiskPath] = useState(initialValues?.diskPath ?? "/");
	const [cooldownMinutes, setCooldownMinutes] = useState(String(initialValues?.cooldownMinutes ?? 15));
	const [enabled, setEnabled] = useState(initialValues?.enabled ?? true);

	function handleOpenChange(next: boolean) {
		if (next) {
			setMetric(initialValues?.metric ?? "cpu");
			setThreshold(String(initialValues?.threshold ?? 80));
			setDiskPath(initialValues?.diskPath ?? "/");
			setCooldownMinutes(String(initialValues?.cooldownMinutes ?? 15));
			setEnabled(initialValues?.enabled ?? true);
			setError(null);
		}
		setOpen(next);
	}

	async function handleSubmit() {
		const thresholdNum = Number(threshold);
		const cooldownNum = Number(cooldownMinutes);
		if (isNaN(thresholdNum) || thresholdNum < 0 || thresholdNum > 100) {
			setError("閾値は0〜100の数値を入力してください。");
			return;
		}
		if (isNaN(cooldownNum) || cooldownNum < 1) {
			setError("冷却時間は1以上の整数を入力してください。");
			return;
		}
		setPending(true);
		setError(null);
		try {
			await onSave({
				metric,
				threshold: thresholdNum,
				diskPath: metric === "disk" ? diskPath : undefined,
				enabled,
				cooldownMinutes: cooldownNum,
			});
			setOpen(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : "保存に失敗しました。");
		} finally {
			setPending(false);
		}
	}

	const inputClass = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";
	const labelClass = "block text-xs font-medium text-muted-foreground mb-1";

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{initialValues ? "アラートルールを編集" : "アラートルールを追加"}</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<div>
						<label className={labelClass} htmlFor="alert-metric">
							メトリクス
						</label>
						<select
							id="alert-metric"
							value={metric}
							onChange={(e) => setMetric(e.target.value as AlertMetric)}
							className={inputClass}
						>
							<option value="cpu">CPU使用率</option>
							<option value="memory">メモリ使用率</option>
							<option value="disk">ディスク使用率</option>
						</select>
					</div>

					{metric === "disk" && (
						<div>
							<label className={labelClass} htmlFor="alert-disk-path">
								ディスクパス
							</label>
							<input
								id="alert-disk-path"
								type="text"
								value={diskPath}
								onChange={(e) => setDiskPath(e.target.value)}
								placeholder="/"
								className={inputClass}
							/>
						</div>
					)}

					<div>
						<label className={labelClass} htmlFor="alert-threshold">
							閾値 (%)
						</label>
						<div className="flex items-center gap-3">
							<input
								id="alert-threshold"
								type="range"
								min={1}
								max={99}
								value={threshold}
								onChange={(e) => setThreshold(e.target.value)}
								className="flex-1"
							/>
							<input
								type="number"
								min={0}
								max={100}
								value={threshold}
								onChange={(e) => setThreshold(e.target.value)}
								className="w-20 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
							/>
						</div>
					</div>

					<div>
						<label className={labelClass} htmlFor="alert-cooldown">
							冷却時間 (分)
						</label>
						<input
							id="alert-cooldown"
							type="number"
							min={1}
							value={cooldownMinutes}
							onChange={(e) => setCooldownMinutes(e.target.value)}
							className={inputClass}
						/>
					</div>

					<div className="flex items-center gap-3">
						<button
							type="button"
							role="switch"
							aria-checked={enabled}
							onClick={() => setEnabled((v) => !v)}
							className={`relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors focus:outline-none ${
								enabled ? "bg-primary" : "bg-input"
							}`}
						>
							<span
								className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
									enabled ? "translate-x-4" : "translate-x-0.5"
								}`}
							/>
						</button>
						<span className="text-sm">{enabled ? "有効" : "無効"}</span>
					</div>

					{error && <p className="text-sm text-destructive">{error}</p>}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)}>
						キャンセル
					</Button>
					<Button disabled={pending} onClick={handleSubmit}>
						{pending ? "保存中..." : "保存する"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
