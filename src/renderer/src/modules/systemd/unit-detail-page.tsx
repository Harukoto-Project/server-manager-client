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
	type SystemdUnitAction,
	fetchSystemdUnitLogs,
	fetchSystemdUnits,
	systemdUnitAction,
} from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";
import { UnitStateBadge } from "./shared";

export function UnitDetailPage() {
	const { nodeId, unit: encodedUnit } = useParams<{ nodeId: string; unit: string }>();
	const unit = encodedUnit ? decodeURIComponent(encodedUnit) : undefined;
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();

	const [pendingAction, setPendingAction] = useState<SystemdUnitAction | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);

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
		queryKey: ["systemd-unit-logs", nodeId, unit],
		queryFn: () => fetchSystemdUnitLogs(node!, token!, unit as string),
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
				<Card>
					<CardHeader>
						<CardTitle className="text-sm">journalctl</CardTitle>
					</CardHeader>
					<CardContent>
						<ConsoleLogViewer
							lines={logsQuery.data ?? []}
							emptyLabel={logsQuery.isLoading ? "ログを取得中..." : "ログはまだありません"}
						/>
					</CardContent>
				</Card>
			}
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}
			{actionError && <p className="mb-4 text-sm text-destructive">{actionError}</p>}

			{unitInfo && (
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
					<DetailField label="Active" value={<UnitStateBadge active={unitInfo.active} />} />
					<DetailField label="Load" value={unitInfo.load || "—"} />
					<DetailField label="Sub" value={unitInfo.sub || "—"} />
					<DetailField label="Unit" value={<span className="font-mono text-xs">{unitInfo.unit}</span>} />
				</div>
			)}
		</DashboardPageLayout>
	);
}
