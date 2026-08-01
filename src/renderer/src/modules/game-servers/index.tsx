import { Gamepad2 } from "lucide-react";
import { AnimatedModuleRoutes } from "@renderer/components/layout/animated-module-routes";
import type { ModuleDefinition } from "@renderer/modules/types";
import { AdminCategoryDetailPage } from "./admin-category-detail-page";
import { AdminListPage } from "./admin-list-page";
import { ServerDetailPage } from "./server-detail-page";
import { ServerListPage } from "./server-list-page";

function GameServersRoutes() {
	return (
		<AnimatedModuleRoutes
			routes={[
				{ index: true, element: <ServerListPage /> },
				{ path: "servers/:identifier", element: <ServerDetailPage /> },
				{ path: "admin", element: <AdminListPage /> },
				{ path: "admin/:category", element: <AdminCategoryDetailPage /> },
			]}
		/>
	);
}

export const gameServersModule: ModuleDefinition = {
	id: "game-servers",
	label: "ゲームサーバー",
	icon: Gamepad2,
	group: "games",
	order: 40,
	element: GameServersRoutes,
};
