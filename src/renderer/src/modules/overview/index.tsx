import { useQuery } from "@tanstack/react-query";
import { Activity, Cpu, HardDrive, MemoryStick } from "lucide-react";
import { useParams } from "react-router-dom";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import { fetchMonitoringSummary } from "@renderer/lib/node-api-client";
import type { ModuleDefinition } from "@renderer/modules/types";
import { useNodesStore } from "@renderer/state/nodes-store";

function formatBytes(bytes: number): string {
	if (!Number.isFinite(bytes)) return "—";
	const units = ["B", "KB", "MB", "GB", "TB"];
	let value = bytes;
	let unitIndex = 0;
	while (value >= 1024 && unitIndex < units.length - 1) {
		value /= 1024;
		unitIndex += 1;
	}
	return `${value.toFixed(1)} ${units[unitIndex]}`;
}

function OverviewPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);

	const {
		data: snapshot,
		isError,
		isLoading,
	} = useQuery({
		queryKey: ["monitoring-summary", nodeId],
		queryFn: () => fetchMonitoringSummary(node!, token!),
		enabled: Boolean(node && token),
		refetchInterval: 3000,
		retry: 1,
	});

	const disk = snapshot?.disks[0];
	const network = snapshot?.network.find((n) => n.rxBytesPerSec > 0 || n.txBytesPerSec > 0) ?? snapshot?.network[0];

	const metrics = [
		{
			label: "CPU使用率",
			value: snapshot ? `${snapshot.cpu.loadPercent.toFixed(1)}%` : "—",
			icon: Cpu,
			hint: snapshot?.cpu.brand ?? "モニタリングAPI接続後に表示",
		},
		{
			label: "メモリ使用率",
			value: snapshot ? `${snapshot.memory.usedPercent.toFixed(1)}%` : "—",
			icon: MemoryStick,
			hint: snapshot ? `${formatBytes(snapshot.memory.usedBytes)} / ${formatBytes(snapshot.memory.totalBytes)}` : "—",
		},
		{
			label: "ディスク使用率",
			value: disk ? `${disk.usedPercent.toFixed(1)}%` : "—",
			icon: HardDrive,
			hint: disk ? `${disk.mount} (${formatBytes(disk.usedBytes)} / ${formatBytes(disk.totalBytes)})` : "—",
		},
		{
			label: "ネットワーク",
			value: network ? `↓${formatBytes(network.rxBytesPerSec)}/s` : "—",
			icon: Activity,
			hint: network ? `${network.interface} ↑${formatBytes(network.txBytesPerSec)}/s` : "—",
		},
	];

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || isLoading) statusMessage = "接続中...";
	else if (isError) statusMessage = "ノードに接続できませんでした。ホスト/ポート/アクセストークンを確認してください。";

	return (
		<DashboardPageLayout
			title="概要"
			description={node ? `${node.name} (${node.host}:${node.port}) のリアルタイムモニタリング` : "概要"}
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{metrics.map((metric) => (
					<Card key={metric.label}>
						<CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium text-muted-foreground">{metric.label}</CardTitle>
							<metric.icon className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-semibold">{metric.value}</div>
							<p className="mt-1 truncate text-xs text-muted-foreground">{metric.hint}</p>
						</CardContent>
					</Card>
				))}
			</div>
		</DashboardPageLayout>
	);
}

export const overviewModule: ModuleDefinition = {
	id: "overview",
	label: "概要",
	icon: Activity,
	group: "overview",
	order: 0,
	element: OverviewPage,
};
