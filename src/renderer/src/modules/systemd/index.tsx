import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers3, Play, Power, PowerOff, RotateCw, Square } from "lucide-react";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { ConfirmDestructiveDialog } from "@renderer/components/common/confirm-destructive-dialog";
import { ConsoleLogViewer } from "@renderer/components/common/console-log-viewer";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Badge } from "@renderer/components/ui/badge";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import {
	NodeApiError,
	type SystemdUnit,
	type SystemdUnitAction,
	fetchSystemdUnitLogs,
	fetchSystemdUnits,
	systemdUnitAction,
} from "@renderer/lib/node-api-client";
import type { ModuleDefinition } from "@renderer/modules/types";
import { useNodesStore } from "@renderer/state/nodes-store";

function UnitStateBadge({ active }: { active: string }) {
	if (active === "active") return <Badge variant="success">稼働中</Badge>;
	if (active === "failed") return <Badge variant="destructive">失敗</Badge>;
	return <Badge variant="secondary">{active || "不明"}</Badge>;
}

function SystemdPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();

	const [filter, setFilter] = useState("");
	const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
	const [pendingAction, setPendingAction] = useState<string | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);

	const ready = Boolean(node && token);

	const unitsQuery = useQuery({
		queryKey: ["systemd-units", nodeId],
		queryFn: () => fetchSystemdUnits(node!, token!),
		enabled: ready,
		refetchInterval: 8000,
		retry: 1,
	});

	const logsQuery = useQuery({
		queryKey: ["systemd-unit-logs", nodeId, selectedUnit],
		queryFn: () => fetchSystemdUnitLogs(node!, token!, selectedUnit as string),
		enabled: ready && Boolean(selectedUnit),
		refetchInterval: 4000,
		retry: 1,
	});

	const filteredUnits = useMemo(() => {
		const units = unitsQuery.data ?? [];
		if (!filter.trim()) return units;
		const needle = filter.trim().toLowerCase();
		return units.filter(
			(u) => u.unit.toLowerCase().includes(needle) || u.description.toLowerCase().includes(needle),
		);
	}, [unitsQuery.data, filter]);

	async function runAction(unit: SystemdUnit, action: SystemdUnitAction) {
		if (!node || !token) return;
		setActionError(null);
		setPendingAction(`${unit.unit}:${action}`);
		try {
			await systemdUnitAction(node, token, unit.unit, action);
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

	return (
		<DashboardPageLayout
			title="systemdサービス"
			description="サービスの起動/停止/再起動・有効化とjournalログの閲覧を行います。"
			actions={
				<input
					value={filter}
					onChange={(e) => setFilter(e.target.value)}
					placeholder="サービス名で絞り込み"
					className="w-56 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
				/>
			}
			inspector={
				selectedUnit ? (
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">journalctl: {selectedUnit}</CardTitle>
						</CardHeader>
						<CardContent>
							<ConsoleLogViewer
								lines={logsQuery.data ?? []}
								emptyLabel={logsQuery.isLoading ? "ログを取得中..." : "ログはまだありません"}
							/>
						</CardContent>
					</Card>
				) : undefined
			}
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}
			{actionError && <p className="mb-4 text-sm text-destructive">{actionError}</p>}

			{ready && !unitsQuery.isLoading && filteredUnits.length === 0 && (
				<Card>
					<CardContent className="py-6 text-sm text-muted-foreground">
						{filter ? "条件に一致するサービスが見つかりませんでした。" : "サービスが見つかりませんでした。"}
					</CardContent>
				</Card>
			)}

			<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
				{filteredUnits.map((unit) => {
					const isActive = unit.active === "active";
					return (
						<Card
							key={unit.unit}
							className={unit.unit === selectedUnit ? "cursor-pointer ring-2 ring-primary" : "cursor-pointer"}
							onClick={() => setSelectedUnit(unit.unit)}
						>
							<CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="flex items-center gap-2 truncate text-sm font-medium">
									<Layers3 className="h-4 w-4 shrink-0 text-muted-foreground" />
									<span className="truncate">{unit.unit}</span>
								</CardTitle>
								<UnitStateBadge active={unit.active} />
							</CardHeader>
							<CardContent className="flex items-center justify-between gap-2">
								<span className="truncate text-xs text-muted-foreground">{unit.description || "—"}</span>
								<div
									className="flex shrink-0 gap-1"
									onClick={(e) => e.stopPropagation()}
									onKeyDown={(e) => e.stopPropagation()}
								>
									<Button
										size="icon"
										variant="ghost"
										title="起動"
										disabled={isActive || pendingAction === `${unit.unit}:start`}
										onClick={() => runAction(unit, "start")}
									>
										<Play className="h-4 w-4" />
									</Button>
									<Button
										size="icon"
										variant="ghost"
										title="再起動"
										disabled={pendingAction === `${unit.unit}:restart`}
										onClick={() => runAction(unit, "restart")}
									>
										<RotateCw className="h-4 w-4" />
									</Button>
									<Button
										size="icon"
										variant="ghost"
										title="自動起動を有効化"
										disabled={pendingAction === `${unit.unit}:enable`}
										onClick={() => runAction(unit, "enable")}
									>
										<Power className="h-4 w-4" />
									</Button>
									<Button
										size="icon"
										variant="ghost"
										title="自動起動を無効化"
										disabled={pendingAction === `${unit.unit}:disable`}
										onClick={() => runAction(unit, "disable")}
									>
										<PowerOff className="h-4 w-4" />
									</Button>
									<ConfirmDestructiveDialog
										trigger={
											<Button size="icon" variant="ghost" title="停止" disabled={!isActive}>
												<Square className="h-4 w-4" />
											</Button>
										}
										title={`${unit.unit} を停止しますか?`}
										description="サービスを停止すると、依存するプロセスも影響を受ける可能性があります。"
										confirmLabel="停止する"
										onConfirm={() => runAction(unit, "stop")}
									/>
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>
		</DashboardPageLayout>
	);
}

export const systemdModule: ModuleDefinition = {
	id: "systemd",
	label: "systemdサービス",
	icon: Layers3,
	group: "operations",
	order: 20,
	element: SystemdPage,
};
