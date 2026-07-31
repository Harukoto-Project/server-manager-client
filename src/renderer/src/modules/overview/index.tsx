import { Activity, Cpu, HardDrive, MemoryStick } from "lucide-react";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import type { ModuleDefinition } from "@renderer/modules/types";

const metrics = [
	{ label: "CPU使用率", value: "—", icon: Cpu, hint: "systeminformation経由でノードから取得予定" },
	{ label: "メモリ使用率", value: "—", icon: MemoryStick, hint: "モニタリングAPI接続後に表示" },
	{ label: "ディスク使用率", value: "—", icon: HardDrive, hint: "モニタリングAPI接続後に表示" },
	{ label: "ネットワーク", value: "—", icon: Activity, hint: "WebSocketストリーム接続後に表示" },
];

function OverviewPage() {
	return (
		<DashboardPageLayout
			title="概要"
			description="このノードのリアルタイムなシステムモニタリングを表示します(GET/WS /monitoring 接続後に実データへ差し替え)。"
		>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{metrics.map((metric) => (
					<Card key={metric.label}>
						<CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium text-muted-foreground">{metric.label}</CardTitle>
							<metric.icon className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-semibold">{metric.value}</div>
							<p className="mt-1 text-xs text-muted-foreground">{metric.hint}</p>
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
