import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Power, PowerOff, RotateCw, Square } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { ConfirmDestructiveDialog } from "@renderer/components/common/confirm-destructive-dialog";
import { ConsoleLogViewer } from "@renderer/components/common/console-log-viewer";
import { DetailField } from "@renderer/components/common/detail-field";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import {
	NodeApiError,
	type SystemdJournalFilter,
	type SystemdUnitAction,
	fetchSystemdJournal,
	fetchSystemdUnits,
	systemdUnitAction,
} from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";
import { UnitStateBadge } from "./shared";

const PRIORITY_OPTIONS = [
	{ value: "", label: "すべて" },
	{ value: "emerg", label: "emerg (0)" },
	{ value: "alert", label: "alert (1)" },
	{ value: "crit", label: "crit (2)" },
	{ value: "err", label: "err (3)" },
	{ value: "warning", label: "warning (4)" },
	{ value: "notice", label: "notice (5)" },
	{ value: "info", label: "info (6)" },
	{ value: "debug", label: "debug (7)" },
];

const TIME_RANGE_PRESETS = [
	{ label: "最新1時間", hours: 1 },
	{ label: "最新6時間", hours: 6 },
	{ label: "最新24時間", hours: 24 },
	{ label: "最新7日間", hours: 168 },
];

function buildSince(hours: number): string {
	return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

interface JournalFilterBarProps {
	unit: string;
	filter: SystemdJournalFilter;
	onChange: (filter: SystemdJournalFilter) => void;
}

function JournalFilterBar({ unit, filter, onChange }: JournalFilterBarProps) {
	const [selectedRange, setSelectedRange] = useState<number | null>(null);
	const [customSince, setCustomSince] = useState("");
	const [customUntil, setCustomUntil] = useState("");
	const [showCustom, setShowCustom] = useState(false);

	function handlePriorityChange(priority: string) {
		onChange({ ...filter, priority: priority || undefined });
	}

	function handleRangePreset(hours: number) {
		setSelectedRange(hours);
		setShowCustom(false);
		onChange({ ...filter, since: buildSince(hours), until: undefined });
	}

	function handleCustom() {
		setSelectedRange(null);
		setShowCustom(true);
	}

	function applyCustomRange() {
		onChange({
			...filter,
			since: customSince || undefined,
			until: customUntil || undefined,
		});
	}

	function clearRange() {
		setSelectedRange(null);
		setShowCustom(false);
		setCustomSince("");
		setCustomUntil("");
		onChange({ ...filter, since: undefined, until: undefined });
	}

	return (
		<div className="mb-3 flex flex-wrap items-end gap-2 rounded-md border bg-muted/30 p-3">
			<div className="flex flex-col gap-1">
				<span className="text-xs font-medium text-muted-foreground">優先度</span>
				<select
					className="rounded-md border border-input bg-background px-2 py-1 text-xs"
					value={filter.priority ?? ""}
					onChange={(e) => handlePriorityChange(e.target.value)}
				>
					{PRIORITY_OPTIONS.map((opt) => (
						<option key={opt.value} value={opt.value}>
							{opt.label}
						</option>
					))}
				</select>
			</div>

			<div className="flex flex-col gap-1">
				<span className="text-xs font-medium text-muted-foreground">時間範囲</span>
				<div className="flex items-center gap-1">
					{TIME_RANGE_PRESETS.map(({ label, hours }) => (
						<button
							key={hours}
							type="button"
							className={`rounded px-2 py-1 text-xs transition-colors ${
								selectedRange === hours
									? "bg-primary text-primary-foreground"
									: "border border-input bg-background hover:bg-accent"
							}`}
							onClick={() => handleRangePreset(hours)}
						>
							{label}
						</button>
					))}
					<button
						type="button"
						className={`rounded px-2 py-1 text-xs transition-colors ${
							showCustom
								? "bg-primary text-primary-foreground"
								: "border border-input bg-background hover:bg-accent"
						}`}
						onClick={handleCustom}
					>
						カスタム
					</button>
					{(selectedRange !== null || showCustom) && (
						<button
							type="button"
							className="rounded border border-input bg-background px-2 py-1 text-xs hover:bg-accent"
							onClick={clearRange}
						>
							クリア
						</button>
					)}
				</div>
			</div>

			{showCustom && (
				<div className="flex items-end gap-2">
					<div className="flex flex-col gap-1">
						<span className="text-xs text-muted-foreground">開始</span>
						<input
							type="datetime-local"
							className="rounded-md border border-input bg-background px-2 py-1 text-xs"
							value={customSince}
							onChange={(e) => setCustomSince(e.target.value)}
						/>
					</div>
					<div className="flex flex-col gap-1">
						<span className="text-xs text-muted-foreground">終了</span>
						<input
							type="datetime-local"
							className="rounded-md border border-input bg-background px-2 py-1 text-xs"
							value={customUntil}
							onChange={(e) => setCustomUntil(e.target.value)}
						/>
					</div>
					<Button size="sm" variant="secondary" onClick={applyCustomRange}>
						適用
					</Button>
				</div>
			)}

			<div className="flex flex-col gap-1">
				<span className="text-xs font-medium text-muted-foreground">サービス</span>
				<span className="rounded-md border border-input bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
					{unit}
				</span>
			</div>
		</div>
	);
}

export function UnitDetailPage() {
	const { nodeId, unit: encodedUnit } = useParams<{ nodeId: string; unit: string }>();
	const unit = encodedUnit ? decodeURIComponent(encodedUnit) : undefined;
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();

	const [pendingAction, setPendingAction] = useState<SystemdUnitAction | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);
	const [journalFilter, setJournalFilter] = useState<SystemdJournalFilter>({
		unit: unit,
		lines: 200,
	});

	const ready = Boolean(node && token);

	const unitsQuery = useQuery({
		queryKey: ["systemd-units", nodeId],
		queryFn: () => fetchSystemdUnits(node!, token!),
		enabled: ready,
		refetchInterval: 8000,
		retry: 1,
	});

	const unitInfo = unitsQuery.data?.find((u) => u.unit === unit);

	const logsQuery = useQuery({
		queryKey: ["systemd-journal", nodeId, unit, journalFilter],
		queryFn: () => fetchSystemdJournal(node!, token!, { ...journalFilter, unit: unit }),
		enabled: ready && Boolean(unit),
		refetchInterval: 4000,
		retry: 1,
	});

	async function runAction(action: SystemdUnitAction) {
		if (!node || !token || !unit) return;
		setActionError(null);
		setPendingAction(action);
		try {
			await systemdUnitAction(node, token, unit, action);
			await queryClient.invalidateQueries({ queryKey: ["systemd-units", nodeId] });
		} catch (error) {
			setActionError(error instanceof NodeApiError ? error.message : "操作に失敗しました。");
		} finally {
			setPendingAction(null);
		}
	}

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || unitsQuery.isLoading) statusMessage = "接続中...";
	else if (unitsQuery.isError)
		statusMessage = unitsQuery.error instanceof NodeApiError ? unitsQuery.error.message : "ノードに接続できませんでした。";
	else if (!unitInfo) statusMessage = "サービスが見つかりませんでした。一覧から選び直してください。";

	const isActive = unitInfo?.active === "active";

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/systemd`}
			backLabel="サービス一覧に戻る"
			title={unit ?? "サービス"}
			description={unitInfo?.description || undefined}
			actions={
				unitInfo && (
					<>
						<Button
							size="sm"
							variant="outline"
							disabled={isActive || pendingAction === "start"}
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
						<Button
							size="sm"
							variant="outline"
							disabled={pendingAction === "enable"}
							onClick={() => runAction("enable")}
						>
							<Power className="h-4 w-4" /> 自動起動を有効化
						</Button>
						<Button
							size="sm"
							variant="outline"
							disabled={pendingAction === "disable"}
							onClick={() => runAction("disable")}
						>
							<PowerOff className="h-4 w-4" /> 自動起動を無効化
						</Button>
						<ConfirmDestructiveDialog
							trigger={
								<Button size="sm" variant="destructive" disabled={!isActive}>
									<Square className="h-4 w-4" /> 停止
								</Button>
							}
							title={`${unit} を停止しますか?`}
							description="サービスを停止すると、依存するプロセスも影響を受ける可能性があります。"
							confirmLabel="停止する"
							onConfirm={() => runAction("stop")}
						/>
					</>
				)
			}
			inspector={
				unitInfo ? (
					<>
						<DetailField label="Active" value={<UnitStateBadge active={unitInfo.active} />} />
						<DetailField label="Load" value={unitInfo.load || "—"} />
						<DetailField label="Sub" value={unitInfo.sub || "—"} />
						<DetailField label="Unit" value={<span className="break-all font-mono text-xs">{unitInfo.unit}</span>} />
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
					<CardTitle className="text-sm">ログ</CardTitle>
				</CardHeader>
				<CardContent className="flex min-h-0 flex-1 flex-col pb-6">
					{unit && (
						<JournalFilterBar
							unit={unit}
							filter={journalFilter}
							onChange={(f) => setJournalFilter({ ...f, unit: unit })}
						/>
					)}
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
