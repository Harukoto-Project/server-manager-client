import { Container, Network, RotateCw, Square } from "lucide-react";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { ConfirmDestructiveDialog } from "@renderer/components/common/confirm-destructive-dialog";
import { Badge } from "@renderer/components/ui/badge";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@renderer/components/ui/tabs";
import type { ModuleDefinition } from "@renderer/modules/types";

const placeholderContainers = [
	{ id: "1", name: "oasis-smp", image: "itzg/minecraft-server", state: "running" },
	{ id: "2", name: "velocity-proxy", image: "itzg/mc-proxy", state: "running" },
	{ id: "3", name: "lavalink", image: "fredboat/lavalink", state: "exited" },
];

function DockerPage() {
	return (
		<DashboardPageLayout
			title="Docker"
			description="コンテナ・イメージ・ボリューム・ネットワークをタブで管理します(dockerode接続後に実データへ差し替え)。"
		>
			<Tabs defaultValue="containers">
				<TabsList>
					<TabsTrigger value="containers">コンテナ</TabsTrigger>
					<TabsTrigger value="images">イメージ</TabsTrigger>
					<TabsTrigger value="volumes">ボリューム</TabsTrigger>
					<TabsTrigger value="networks">ネットワーク</TabsTrigger>
				</TabsList>

				<TabsContent value="containers" className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
					{placeholderContainers.map((container) => (
						<Card key={container.id}>
							<CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="flex items-center gap-2 text-sm font-medium">
									<Container className="h-4 w-4 text-muted-foreground" />
									{container.name}
								</CardTitle>
								<Badge variant={container.state === "running" ? "success" : "secondary"}>
									{container.state === "running" ? "起動中" : "停止中"}
								</Badge>
							</CardHeader>
							<CardContent className="flex items-center justify-between">
								<span className="text-xs text-muted-foreground">{container.image}</span>
								<div className="flex gap-1">
									<Button size="icon" variant="ghost" title="再起動">
										<RotateCw className="h-4 w-4" />
									</Button>
									<ConfirmDestructiveDialog
										trigger={
											<Button size="icon" variant="ghost" title="停止">
												<Square className="h-4 w-4" />
											</Button>
										}
										title={`${container.name} を停止しますか?`}
										description="コンテナを停止すると、接続中のプレイヤー・クライアントは切断されます。"
										confirmLabel="停止する"
										onConfirm={() => {
											/* TODO: POST /docker/containers/:id/action stop */
										}}
									/>
								</div>
							</CardContent>
						</Card>
					))}
				</TabsContent>

				<TabsContent value="images">
					<p className="text-sm text-muted-foreground">GET /docker/images 接続後に一覧表示します。</p>
				</TabsContent>
				<TabsContent value="volumes">
					<p className="text-sm text-muted-foreground">GET /docker/volumes 接続後に一覧表示します。</p>
				</TabsContent>
				<TabsContent value="networks">
					<p className="flex items-center gap-2 text-sm text-muted-foreground">
						<Network className="h-4 w-4" /> GET /docker/networks 接続後に一覧表示します。
					</p>
				</TabsContent>
			</Tabs>
		</DashboardPageLayout>
	);
}

export const dockerModule: ModuleDefinition = {
	id: "docker",
	label: "Docker",
	icon: Container,
	group: "operations",
	order: 10,
	element: DockerPage,
};
