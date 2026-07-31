import { Layers3 } from "lucide-react";
import { AnimatedModuleRoutes } from "@renderer/components/layout/animated-module-routes";
import type { ModuleDefinition } from "@renderer/modules/types";
import { SystemdListPage } from "./systemd-list-page";
import { UnitDetailPage } from "./unit-detail-page";

function SystemdRoutes() {
	return (
		<AnimatedModuleRoutes
			routes={[
				{ index: true, element: <SystemdListPage /> },
				{ path: "units/:unit", element: <UnitDetailPage /> },
			]}
		/>
	);
}

export const systemdModule: ModuleDefinition = {
	id: "systemd",
	label: "systemdサービス",
	icon: Layers3,
	group: "operations",
	order: 20,
	element: SystemdRoutes,
};
