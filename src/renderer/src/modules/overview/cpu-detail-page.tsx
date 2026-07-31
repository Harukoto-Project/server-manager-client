import { DetailField } from "@renderer/components/common/detail-field";
import { TimeSeriesChart } from "@renderer/components/common/time-series-chart";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { useOverviewMonitoring } from "./use-overview-monitoring";

export function CpuDetailPage() {
	const { nodeId, snapshot, history, statusMessage } = useOverviewMonitoring();

	const chartData = history.map((snap) => ({ timestamp: snap.timestamp, loadPercent: snap.cpu.loadPercent }));

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/overview`}
			backLabel="概要に戻る"
			title="CPU使用率"
			description={snapshot?.cpu.brand}
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}

			<Card className="mb-4">
				<CardHeader>
					<CardTitle className="text-sm">使用率の推移(このページを開いている間の記録)</CardTitle>
				</CardHeader>
				<CardContent>
					<TimeSeriesChart
						data={chartData}
						series={[{ key: "loadPercent", label: "CPU使用率", color: "hsl(var(--primary))" }]}
						yDomain={[0, 100]}
						valueFormatter={(v) => `${v.toFixed(0)}%`}
					/>
				</CardContent>
			</Card>

			{snapshot && (
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
					<DetailField label="現在の使用率" value={`${snapshot.cpu.loadPercent.toFixed(1)}%`} />
					<DetailField label="製造元" value={snapshot.cpu.manufacturer} />
					<DetailField label="モデル" value={snapshot.cpu.brand} />
					<DetailField label="コア数" value={`${snapshot.cpu.cores} コア`} />
				</div>
			)}
		</DashboardPageLayout>
	);
}
