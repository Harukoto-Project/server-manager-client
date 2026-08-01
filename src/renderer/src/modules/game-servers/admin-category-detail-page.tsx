import { Construction } from "lucide-react";
import type { ComponentType } from "react";
import { useParams } from "react-router-dom";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Card, CardContent } from "@renderer/components/ui/card";
import { gameServersAdminCategories } from "./admin-categories";
import { AllocationsPage } from "./admin-pages/allocations-page";
import { CreateServerPage } from "./admin-pages/create-server-page";
import { EggNestPage } from "./admin-pages/egg-nest-page";
import { MountsRolesPage } from "./admin-pages/mounts-roles-page";
import { NodesPage } from "./admin-pages/nodes-page";
import { PanelUsersPage } from "./admin-pages/panel-users-page";

const categoryComponents: Record<string, ComponentType> = {
	"create-server": CreateServerPage,
	"egg-nest": EggNestPage,
	nodes: NodesPage,
	"panel-users": PanelUsersPage,
	allocations: AllocationsPage,
	"mounts-roles": MountsRolesPage,
};

function PlaceholderDetailPage() {
	const { nodeId, category: categoryId } = useParams<{ nodeId: string; category: string }>();
	const category = gameServersAdminCategories.find((c) => c.id === categoryId);

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/game-servers/admin`}
			backLabel="管理者機能一覧に戻る"
			title={category?.label ?? "管理者機能"}
			description={category?.description}
		>
			<Card>
				<CardContent className="flex flex-col items-center gap-3 py-16 text-center">
					<Construction className="h-8 w-8 text-muted-foreground" />
					<p className="text-sm font-medium">この機能は現在実装中です</p>
					<p className="max-w-md text-xs text-muted-foreground">
						この管理機能の内容は後続のタスクで実装予定です。しばらくお待ちください。
					</p>
				</CardContent>
			</Card>
		</DashboardPageLayout>
	);
}

export function AdminCategoryDetailPage() {
	const { category: categoryId } = useParams<{ nodeId: string; category: string }>();
	const Component = categoryId ? categoryComponents[categoryId] : undefined;
	if (!Component) return <PlaceholderDetailPage />;
	return <Component />;
}
