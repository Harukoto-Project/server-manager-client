import { Network } from "lucide-react";
import { useMemo, useState } from "react";
import { EntityList, EntityListItem } from "@renderer/components/common/entity-list";
import { TimeRangeSelector } from "@renderer/components/common/time-range-selector";
import { TimeSeriesChart } from "@renderer/components/common/time-series-chart";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@renderer/components/ui/tabs";
import { useMonitoringHistoryQuery } from "@renderer/hooks/use-monitoring-history-query";
import { formatBytes } from "@renderer/lib/utils";
import { useOverviewMonitoring } from "./use-overview-monitoring";

export function NetworkDetailPage() {
	const { nodeId, snapshot, statusMessage } = useOverviewMonitoring();
	const interfaces = snapshot?.network ?? [];

	const [selectedInterface, setSelectedInterface] = useState<string | undefined>(undefined);
	const activeInterface =
		selectedInterface ??
		interfaces.find((n) => n.rxBytesPerSec > 0 || n.txBytesPerSec > 0)?.interface ??
		interfaces[0]?.interface;
	const activeEntry = interfaces.find((n) => n.interface === activeInterface);

	const [rangeMinutes, setRangeMinutes] = useState(60);
	const { history, statusMessage: historyStatusMessage } = useMonitoringHistoryQuery(nodeId, rangeMinutes);

	const chartData = useMemo(
		() =>
			history
				.map((snap) => {
					const entry = snap.network.find((n) => n.interface === activeInterface);
					return entry
						? { timestamp: snap.timestamp, rx: entry.rxBytesPerSec, tx: entry.txBytesPerSec }
						: null;
				})
				.filter((v): v is { timestamp: string; rx: number; tx: number } => v !== null),
		[history, activeInterface],
	);

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/overview`}
			backLabel="概要に戻る"
			title="ネットワーク"
			description={activeEntry ? `${activeEntry.interface} の推移を表示中` : undefined}
			actions={
				interfaces.length > 1 ? (
					<Tabs value={activeInterface} onValueChange={setSelectedInterface}>
						<TabsList>
							{interfaces.map((iface) => (
								<TabsTrigger key={iface.interface} value={iface.interface}>
									{iface.interface}
								</TabsTrigger>
							))}
						</TabsList>
					</Tabs>
				) : undefined
			}
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}

			{activeEntry && (
				<Card className="mb-4">
					<CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
						<CardTitle className="text-sm">{activeEntry.interface} 通信量の推移</CardTitle>
						<TimeRangeSelector value={rangeMinutes} onChange={setRangeMinutes} />
					</CardHeader>
					<CardContent>
						{historyStatusMessage && chartData.length === 0 ? (
							<p className="text-sm text-muted-foreground">{historyStatusMessage}</p>
						) : (
							<TimeSeriesChart
								data={chartData}
								series={[
									{ key: "rx", label: "受信 (↓)", color: "hsl(var(--primary))" },
									{ key: "tx", label: "送信 (↑)", color: "hsl(160 84% 39%)" },
								]}
								valueFormatter={(v) => `${formatBytes(v)}/s`}
							/>
						)}
					</CardContent>
				</Card>
			)}

			{interfaces.length > 0 && (
				<EntityList>
					{interfaces.map((iface) => (
						<EntityListItem
							key={iface.interface}
							icon={Network}
							title={iface.interface}
							meta={`↓${formatBytes(iface.rxBytesPerSec)}/s  ↑${formatBytes(iface.txBytesPerSec)}/s`}
							onClick={() => setSelectedInterface(iface.interface)}
						/>
					))}
				</EntityList>
			)}
		</DashboardPageLayout>
	);
}
