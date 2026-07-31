import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
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
import {
	type LogrotateConfigSummary,
	type LogrotateFrequency,
	fetchLogrotateConfigs,
	updateLogrotateConfig,
} from "@renderer/lib/api/system-settings/log-management";
import { NodeApiError } from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";

const inputClassName = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";

const FREQUENCY_OPTIONS: Array<{ value: LogrotateFrequency; label: string }> = [
	{ value: "daily", label: "毎日(daily)" },
	{ value: "weekly", label: "毎週(weekly)" },
	{ value: "monthly", label: "毎月(monthly)" },
	{ value: "yearly", label: "毎年(yearly)" },
];

interface EditLogrotateDialogProps {
	trigger: React.ReactNode;
	config: LogrotateConfigSummary;
	onSave: (rotate: number, frequency: LogrotateFrequency) => Promise<void>;
}

function EditLogrotateDialog({ trigger, config, onSave }: EditLogrotateDialogProps) {
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [rotate, setRotate] = useState(String(config.rotate ?? 4));
	const [frequency, setFrequency] = useState<LogrotateFrequency>(config.frequency ?? "weekly");

	function handleOpenChange(next: boolean) {
		if (next) {
			setRotate(String(config.rotate ?? 4));
			setFrequency(config.frequency ?? "weekly");
			setError(null);
		}
		setOpen(next);
	}

	async function handleSubmit() {
		const rotateValue = Number(rotate);
		if (!Number.isInteger(rotateValue) || rotateValue < 0) {
			setError("保持世代数(rotate)は0以上の整数で指定してください。");
			return;
		}
		setPending(true);
		setError(null);
		try {
			await onSave(rotateValue, frequency);
			setOpen(false);
		} catch (err) {
			setError(err instanceof NodeApiError ? err.message : "設定の更新に失敗しました。");
		} finally {
			setPending(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{config.name} の設定を変更</DialogTitle>
					<DialogDescription>ログの保持世代数(rotate)とローテーション頻度を変更します。</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="logrotate-rotate">
							保持世代数(rotate)
						</label>
						<input
							id="logrotate-rotate"
							type="number"
							min={0}
							autoFocus
							value={rotate}
							onChange={(e) => setRotate(e.target.value)}
							className={`${inputClassName} font-mono`}
						/>
					</div>

					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="logrotate-frequency">
							ローテーション頻度
						</label>
						<select
							id="logrotate-frequency"
							value={frequency}
							onChange={(e) => setFrequency(e.target.value as LogrotateFrequency)}
							className={inputClassName}
						>
							{FREQUENCY_OPTIONS.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
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

export function LogManagementPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();

	const [actionError, setActionError] = useState<string | null>(null);

	const ready = Boolean(node && token);

	const configsQuery = useQuery({
		queryKey: ["system-settings-log-management-configs", nodeId],
		queryFn: () => fetchLogrotateConfigs(node!, token!),
		enabled: ready,
		retry: 1,
	});

	async function refresh() {
		await queryClient.invalidateQueries({ queryKey: ["system-settings-log-management-configs", nodeId] });
	}

	async function handleSave(name: string, rotate: number, frequency: LogrotateFrequency) {
		if (!node || !token) return;
		setActionError(null);
		try {
			await updateLogrotateConfig(node, token, name, { rotate, frequency });
			await refresh();
		} catch (error) {
			const message = error instanceof NodeApiError ? error.message : "設定の更新に失敗しました。";
			setActionError(message);
			throw error;
		}
	}

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || configsQuery.isLoading) statusMessage = "接続中...";
	else if (configsQuery.isError)
		statusMessage =
			configsQuery.error instanceof NodeApiError ? configsQuery.error.message : "ノードに接続できませんでした。";
	else if (ready && configsQuery.data?.length === 0) statusMessage = "/etc/logrotate.d/ に設定ファイルはありません。";

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/system-settings`}
			backLabel="設定一覧に戻る"
			title="ログ管理の設定"
			description="/etc/logrotate.d/ 配下の設定ファイルの保持世代数(rotate)とローテーション頻度を確認・変更します。"
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}
			{actionError && <p className="mb-4 text-sm text-destructive">{actionError}</p>}

			{configsQuery.data && configsQuery.data.length > 0 && (
				<EntityList>
					{configsQuery.data.map((config) => (
						<EntityListItem
							key={config.name}
							icon={ScrollText}
							title={config.name}
							subtitle={`頻度: ${config.frequency ?? "未設定"} / maxsize: ${config.maxsize ?? "未設定"}`}
							meta={`rotate ${config.rotate ?? "—"}`}
							badge={
								<EditLogrotateDialog
									trigger={
										<Button size="sm" variant="outline">
											編集
										</Button>
									}
									config={config}
									onSave={(rotate, frequency) => handleSave(config.name, rotate, frequency)}
								/>
							}
						/>
					))}
				</EntityList>
			)}
		</DashboardPageLayout>
	);
}
