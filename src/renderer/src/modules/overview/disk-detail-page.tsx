import { useMemo, useState } from "react";
import { TimeRangeSelector } from "@renderer/components/common/time-range-selector";
import { TimeSeriesChart } from "@renderer/components/common/time-series-chart";
import { UsageBar } from "@renderer/components/common/usage-bar";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { useMonitoringHistoryQuery } from "@renderer/hooks/use-monitoring-history-query";
import { formatBytes } from "@renderer/lib/utils";
import { useOverviewMonitoring } from "./use-overview-monitoring";

export function DiskDetailPage() {
	const { nodeId, snapshot, statusMessage } = useOverviewMonitoring();
	const disks = snapshot?.disks ?? [];

	const [selectedMount, setSelectedMount] = useState<string | undefined>(undefined);
	const activeMount = selectedMount ?? disks.find((d) => d.mount === "/")?.mount ?? disks[0]?.mount;
	const activeDisk = disks.find((d) => d.mount === activeMount);

	const [rangeMinutes, setRangeMinutes] = useState(60);
	const { history, statusMessage: historyStatusMessage } = useMonitoringHistoryQuery(nodeId, rangeMinutes);

	const chartData = useMemo(
		() =>
			history
				.map((snap) => {
					const entry = snap.disks.find((d) => d.mount === activeMount);
					return entry ? { timestamp: snap.timestamp, usedPercent: entry.usedPercent } : null;
				})
				.filter((v): v is { timestamp: string; usedPercent: number } => v !== null),
		[history, activeMount],
	);

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/overview`}
			backLabel="概要に戻る"
			title="ディスク使用率"
			description={activeDisk ? `${activeDisk.mount} の推移を表示中` : undefined}
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}

			{activeDisk && (
				<Card className="mb-4">
					<CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
						<CardTitle className="text-sm">{activeDisk.mount} 使用率の推移</CardTitle>
						<TimeRangeSelector value={rangeMinutes} onChange={setRangeMinutes} />
					</CardHeader>
					<CardContent>
						{historyStatusMessage && chartData.length === 0 ? (
							<p className="text-sm text-muted-foreground">{historyStatusMessage}</p>
						) : (
							<TimeSeriesChart
								data={chartData}
								series={[{ key: "usedPercent", label: "使用率", color: "hsl(var(--primary))" }]}
								yDomain={[0, 100]}
								valueFormatter={(v) => `${v.toFixed(0)}%`}
							/>
						)}
					</CardContent>
				</Card>
			)}

			{disks.length > 0 && (
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
					{disks.map((disk) => (
						<button
							key={disk.mount}
							type="button"
							onClick={() => setSelectedMount(disk.mount)}
							className="text-left"
						>
							<UsageBar
								label={disk.mount}
								usedPercent={disk.usedPercent}
								hint={`${formatBytes(disk.usedBytes)} / ${formatBytes(disk.totalBytes)}`}
								className={disk.mount === activeMount ? "ring-2 ring-primary" : undefined}
							/>
						</button>
					))}
				</div>
			)}
		</DashboardPageLayout>
	);
}
