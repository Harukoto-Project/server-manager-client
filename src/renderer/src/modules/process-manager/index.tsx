import { Terminal } from "lucide-react";
import { Route, Routes } from "react-router-dom";
import type { ModuleDefinition } from "@renderer/modules/types";
import { ProjectDetailPage } from "./project-detail-page";
import { ProjectListPage } from "./project-list-page";

function ProcessManagerRoutes() {
	return (
		<Routes>
			<Route index element={<ProjectListPage />} />
			<Route path=":projectId" element={<ProjectDetailPage />} />
		</Routes>
	);
}

export const processManagerModule: ModuleDefinition = {
	id: "process-manager",
	label: "プロセス管理",
	icon: Terminal,
	group: "development",
	order: 50,
	element: ProcessManagerRoutes,
};
