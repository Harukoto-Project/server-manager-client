import { Gamepad2, Play, RotateCw, Square } from "lucide-react";
import { useState } from "react";
import { ConfirmDestructiveDialog } from "@renderer/components/common/confirm-destructive-dialog";
import { ConsoleLogViewer } from "@renderer/components/common/console-log-viewer";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Badge } from "@renderer/components/ui/badge";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import type { ModuleDefinition } from "@renderer/modules/types";

// Pterodactylパネルで実運用中のサーバー(2026-07-31時点で確認済み)をプレースホルダーとして表示
const placeholderServers = [
	{ identifier: "37e439a3", name: "Velocity Proxy", status: "running" },
	{ identifier: "f0a6185c", name: "[OSMP] Modded Server", status: "running" },
	{ identifier: "e1932e33", name: "Oasis SMP", status: "running" },
	{ identifier: "c4932519", name: "Lavalink", status: "running" },
	{ identifier: "d864a533", name: "Mekanism", status: "offline" },
];

function GameServersPage() {
	const [selected, setSelected] = useState(placeholderServers[0]);

	return (
		<DashboardPageLayout
			title="Minecraft / ゲームサーバー"
			description="既存Pterodactylパネルの Application/Client API 経由でサーバーを管理します(自前デザインのGUI)。"
			inspector={
				<Card>
					<CardHeader>
						<CardTitle className="text-sm">コンソール: {selected.name}</CardTitle>
					</CardHeader>
					<CardContent>
						<ConsoleLogViewer
							lines={[]}
							emptyLabel="Pterodactyl Client APIのWebSocketに接続するとここにログが流れます"
						/>
					</CardContent>
				</Card>
			}
		>
			<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
				{placeholderServers.map((server) => (
					<Card
						key={server.identifier}
						className={server.identifier === selected.identifier ? "ring-2 ring-primary" : undefined}
						onClick={() => setSelected(server)}
					>
						<CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="flex items-center gap-2 text-sm font-medium">
								<Gamepad2 className="h-4 w-4 text-muted-foreground" />
								{server.name}
							</CardTitle>
							<Badge variant={server.status === "running" ? "success" : "secondary"}>
								{server.status === "running" ? "稼働中" : "停止中"}
							</Badge>
						</CardHeader>
						<CardContent className="flex items-center justify-between">
							<span className="text-xs text-muted-foreground">#{server.identifier}</span>
							<div className="flex gap-1">
								<Button size="icon" variant="ghost" title="起動">
									<Play className="h-4 w-4" />
								</Button>
								<Button size="icon" variant="ghost" title="再起動">
									<RotateCw className="h-4 w-4" />
								</Button>
								<ConfirmDestructiveDialog
									trigger={
										<Button size="icon" variant="ghost" title="停止">
											<Square className="h-4 w-4" />
										</Button>
									}
									title={`${server.name} を停止しますか?`}
									description="プレイヤーが接続中の場合は強制的に切断されます。"
									confirmLabel="停止する"
									onConfirm={() => {
										/* TODO: POST /game-servers/servers/:identifier/power { signal: "stop" } */
									}}
								/>
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		</DashboardPageLayout>
	);
}

export const gameServersModule: ModuleDefinition = {
	id: "game-servers",
	label: "ゲームサーバー",
	icon: Gamepad2,
	group: "games",
	order: 40,
	element: GameServersPage,
};
