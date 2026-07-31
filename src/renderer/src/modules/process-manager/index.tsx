import { Terminal } from "lucide-react";
import { AnimatedModuleRoutes } from "@renderer/components/layout/animated-module-routes";
import type { ModuleDefinition } from "@renderer/modules/types";
import { ProjectDetailPage } from "./project-detail-page";
import { ProjectListPage } from "./project-list-page";

function ProcessManagerRoutes() {
	return (
		<AnimatedModuleRoutes
			routes={[
				{ index: true, element: <ProjectListPage /> },
				{ path: ":projectId", element: <ProjectDetailPage /> },
			]}
		/>
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
