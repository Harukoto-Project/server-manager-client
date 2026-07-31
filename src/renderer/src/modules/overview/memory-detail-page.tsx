import { useState } from "react";
import { DetailField } from "@renderer/components/common/detail-field";
import { TimeRangeSelector } from "@renderer/components/common/time-range-selector";
import { TimeSeriesChart } from "@renderer/components/common/time-series-chart";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { useMonitoringHistoryQuery } from "@renderer/hooks/use-monitoring-history-query";
import { formatBytes } from "@renderer/lib/utils";
import { useOverviewMonitoring } from "./use-overview-monitoring";

export function MemoryDetailPage() {
	const { nodeId, snapshot, statusMessage } = useOverviewMonitoring();
	const [rangeMinutes, setRangeMinutes] = useState(60);
	const { history, statusMessage: historyStatusMessage } = useMonitoringHistoryQuery(nodeId, rangeMinutes);

	const chartData = history.map((snap) => ({ timestamp: snap.timestamp, usedPercent: snap.memory.usedPercent }));

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/overview`}
			backLabel="概要に戻る"
			title="メモリ使用率"
			description={
				snapshot ? `${formatBytes(snapshot.memory.usedBytes)} / ${formatBytes(snapshot.memory.totalBytes)}` : undefined
			}
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}

			<Card className="mb-4">
				<CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
					<CardTitle className="text-sm">使用率の推移</CardTitle>
					<TimeRangeSelector value={rangeMinutes} onChange={setRangeMinutes} />
				</CardHeader>
				<CardContent>
					{historyStatusMessage && chartData.length === 0 ? (
						<p className="text-sm text-muted-foreground">{historyStatusMessage}</p>
					) : (
						<TimeSeriesChart
							data={chartData}
							series={[{ key: "usedPercent", label: "メモリ使用率", color: "hsl(var(--primary))" }]}
							yDomain={[0, 100]}
							valueFormatter={(v) => `${v.toFixed(0)}%`}
						/>
					)}
				</CardContent>
			</Card>

			{snapshot && (
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
					<DetailField label="使用率" value={`${snapshot.memory.usedPercent.toFixed(1)}%`} />
					<DetailField label="使用中" value={formatBytes(snapshot.memory.usedBytes)} />
					<DetailField label="空き" value={formatBytes(snapshot.memory.freeBytes)} />
					<DetailField label="合計" value={formatBytes(snapshot.memory.totalBytes)} />
				</div>
			)}
		</DashboardPageLayout>
	);
}
