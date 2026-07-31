import { Gamepad2 } from "lucide-react";
import { Route, Routes } from "react-router-dom";
import type { ModuleDefinition } from "@renderer/modules/types";
import { ServerDetailPage } from "./server-detail-page";
import { ServerListPage } from "./server-list-page";

function GameServersRoutes() {
	return (
		<Routes>
			<Route index element={<ServerListPage />} />
			<Route path="servers/:identifier" element={<ServerDetailPage />} />
		</Routes>
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
