import { Activity, ChevronRight, Cpu, HardDrive, MemoryStick } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { formatBytes } from "@renderer/lib/utils";
import { useOverviewMonitoring } from "./use-overview-monitoring";

export function OverviewListPage() {
	const navigate = useNavigate();
	const { nodeId, node, snapshot, statusMessage } = useOverviewMonitoring();

	const disk = snapshot?.disks[0];
	const network = snapshot?.network.find((n) => n.rxBytesPerSec > 0 || n.txBytesPerSec > 0) ?? snapshot?.network[0];

	const metrics = [
		{
			id: "cpu",
			label: "CPU使用率",
			value: snapshot ? `${snapshot.cpu.loadPercent.toFixed(1)}%` : "—",
			icon: Cpu,
			hint: snapshot?.cpu.brand ?? "モニタリングAPI接続後に表示",
		},
		{
			id: "memory",
			label: "メモリ使用率",
			value: snapshot ? `${snapshot.memory.usedPercent.toFixed(1)}%` : "—",
			icon: MemoryStick,
			hint: snapshot ? `${formatBytes(snapshot.memory.usedBytes)} / ${formatBytes(snapshot.memory.totalBytes)}` : "—",
		},
		{
			id: "disk",
			label: "ディスク使用率",
			value: disk ? `${disk.usedPercent.toFixed(1)}%` : "—",
			icon: HardDrive,
			hint: disk ? `${disk.mount} (${formatBytes(disk.usedBytes)} / ${formatBytes(disk.totalBytes)})` : "—",
		},
		{
			id: "network",
			label: "ネットワーク",
			value: network ? `↓${formatBytes(network.rxBytesPerSec)}/s` : "—",
			icon: Activity,
			hint: network ? `${network.interface} ↑${formatBytes(network.txBytesPerSec)}/s` : "—",
		},
	] as const;

	return (
		<DashboardPageLayout
			title="概要"
			description={node ? `${node.name} (${node.host}:${node.port}) のリアルタイムモニタリング` : "概要"}
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{metrics.map((metric) => (
					<Card
						key={metric.id}
						className="cursor-pointer transition-colors hover:bg-accent/40"
						onClick={() => navigate(`/nodes/${nodeId}/overview/${metric.id}`)}
					>
						<CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium text-muted-foreground">{metric.label}</CardTitle>
							<metric.icon className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="flex items-end justify-between gap-2">
								<div className="text-2xl font-semibold">{metric.value}</div>
								<ChevronRight className="mb-1 h-4 w-4 shrink-0 text-muted-foreground/60" />
							</div>
							<p className="mt-1 truncate text-xs text-muted-foreground">{metric.hint}</p>
						</CardContent>
					</Card>
				))}
			</div>
		</DashboardPageLayout>
	);
}
