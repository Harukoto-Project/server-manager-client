import { Play, Plus, RotateCw, Square, Terminal } from "lucide-react";
import { useState } from "react";
import { ConsoleLogViewer } from "@renderer/components/common/console-log-viewer";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Badge } from "@renderer/components/ui/badge";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import type { ModuleDefinition } from "@renderer/modules/types";

const placeholderProjects = [
	{ id: "1", name: "discord-bot", kind: "node", status: "running" },
	{ id: "2", name: "backup-scheduler", kind: "python", status: "stopped" },
];

function ProcessManagerPage() {
	const [selected, setSelected] = useState(placeholderProjects[0]);

	return (
		<DashboardPageLayout
			title="Node.js / Pythonプロジェクト"
			description="プロジェクトの起動/停止/自動再起動と、WebSocketによるリアルタイムコンソールを提供します。"
			actions={
				<Button size="sm">
					<Plus className="h-4 w-4" /> プロジェクトを追加
				</Button>
			}
			inspector={
				<Card>
					<CardHeader>
						<CardTitle className="text-sm">コンソール: {selected.name}</CardTitle>
					</CardHeader>
					<CardContent>
						<ConsoleLogViewer
							lines={[]}
							emptyLabel="WebSocket /process-manager/projects/:id/console 接続後にログが流れます"
						/>
					</CardContent>
				</Card>
			}
		>
			<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
				{placeholderProjects.map((project) => (
					<Card
						key={project.id}
						className={project.id === selected.id ? "ring-2 ring-primary" : undefined}
						onClick={() => setSelected(project)}
					>
						<CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="flex items-center gap-2 text-sm font-medium">
								<Terminal className="h-4 w-4 text-muted-foreground" />
								{project.name}
							</CardTitle>
							<Badge variant="outline">{project.kind}</Badge>
						</CardHeader>
						<CardContent className="flex items-center justify-between">
							<Badge variant={project.status === "running" ? "success" : "secondary"}>
								{project.status === "running" ? "稼働中" : "停止中"}
							</Badge>
							<div className="flex gap-1">
								<Button size="icon" variant="ghost" title="起動">
									<Play className="h-4 w-4" />
								</Button>
								<Button size="icon" variant="ghost" title="再起動">
									<RotateCw className="h-4 w-4" />
								</Button>
								<Button size="icon" variant="ghost" title="停止">
									<Square className="h-4 w-4" />
								</Button>
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		</DashboardPageLayout>
	);
}

export const processManagerModule: ModuleDefinition = {
	id: "process-manager",
	label: "プロセス管理",
	icon: Terminal,
	group: "development",
	order: 50,
	element: ProcessManagerPage,
};
