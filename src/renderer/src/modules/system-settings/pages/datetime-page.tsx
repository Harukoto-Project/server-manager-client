import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ConfirmDestructiveDialog } from "@renderer/components/common/confirm-destructive-dialog";
import { DetailField } from "@renderer/components/common/detail-field";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import { fetchTimezones, updateTimezone } from "@renderer/lib/api/system-settings/basics";
import { NodeApiError, fetchSystemSettingsBasics } from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";

const inputClassName = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";

export function DatetimePage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();
	const ready = Boolean(node && token);

	const [selectedTimezone, setSelectedTimezone] = useState("");
	const [pending, setPending] = useState(false);
	const [actionError, setActionError] = useState<string | null>(null);
	const [now, setNow] = useState(new Date());

	const basicsQuery = useQuery({
		queryKey: ["system-settings-basics", nodeId],
		queryFn: () => fetchSystemSettingsBasics(node!, token!),
		enabled: ready,
		retry: 1,
	});

	const timezonesQuery = useQuery({
		queryKey: ["system-settings-timezones", nodeId],
		queryFn: () => fetchTimezones(node!, token!),
		enabled: ready,
		retry: 1,
		staleTime: 5 * 60_000,
	});

	useEffect(() => {
		if (basicsQuery.data?.timezone) setSelectedTimezone(basicsQuery.data.timezone);
	}, [basicsQuery.data?.timezone]);

	useEffect(() => {
		const interval = setInterval(() => setNow(new Date()), 1000);
		return () => clearInterval(interval);
	}, []);

	async function handleConfirm() {
		if (!node || !token || !selectedTimezone) return;
		setActionError(null);
		setPending(true);
		try {
			await updateTimezone(node, token, selectedTimezone);
			await queryClient.invalidateQueries({ queryKey: ["system-settings-basics", nodeId] });
		} catch (error) {
			setActionError(error instanceof NodeApiError ? error.message : "タイムゾーンの変更に失敗しました。");
		} finally {
			setPending(false);
		}
	}

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || basicsQuery.isLoading) statusMessage = "接続中...";
	else if (basicsQuery.isError)
		statusMessage = basicsQuery.error instanceof NodeApiError ? basicsQuery.error.message : "ノードに接続できませんでした。";

	const currentTimezone = basicsQuery.data?.timezone ?? "";
	const changed = selectedTimezone.length > 0 && selectedTimezone !== currentTimezone;

	let currentTimeLabel = "-";
	try {
		currentTimeLabel = currentTimezone
			? now.toLocaleString("ja-JP", { timeZone: currentTimezone })
			: now.toLocaleString("ja-JP");
	} catch {
		currentTimeLabel = now.toLocaleString("ja-JP");
	}

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/system-settings`}
			backLabel="設定一覧に戻る"
			title="日付と時刻"
			description="タイムゾーンや時刻の設定を確認・変更します。"
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}
			{actionError && <p className="mb-4 text-sm text-destructive">{actionError}</p>}

			<div className="max-w-lg space-y-4">
				<DetailField label="現在のタイムゾーン" value={currentTimezone || "取得中..."} />
				<DetailField label="現在の日時(選択中のタイムゾーン基準)" value={currentTimeLabel} />

				<Card>
					<CardHeader>
						<CardTitle className="text-sm">タイムゾーンを変更</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="space-y-1">
							<label className="text-xs font-medium text-muted-foreground" htmlFor="timezone-select">
								タイムゾーン
							</label>
							<select
								id="timezone-select"
								value={selectedTimezone}
								onChange={(e) => setSelectedTimezone(e.target.value)}
								className={inputClassName}
								disabled={!ready || timezonesQuery.isLoading}
							>
								{selectedTimezone && !timezonesQuery.data?.includes(selectedTimezone) && (
									<option value={selectedTimezone}>{selectedTimezone}</option>
								)}
								{(timezonesQuery.data ?? []).map((tz) => (
									<option key={tz} value={tz}>
										{tz}
									</option>
								))}
							</select>
						</div>

						<ConfirmDestructiveDialog
							trigger={
								<Button size="sm" variant="destructive" disabled={!ready || !changed || pending}>
									<Clock className="h-4 w-4" /> {pending ? "変更中..." : "タイムゾーンを変更する"}
								</Button>
							}
							title={`タイムゾーンを「${selectedTimezone}」に変更しますか?`}
							description="タイムゾーンの変更は、ログの時刻表示やスケジュール実行タスクの動作時刻に影響します。"
							confirmLabel="変更する"
							onConfirm={handleConfirm}
						/>
					</CardContent>
				</Card>
			</div>
		</DashboardPageLayout>
	);
}
