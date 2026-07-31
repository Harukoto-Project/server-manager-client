import { Layers3 } from "lucide-react";
import { Route, Routes } from "react-router-dom";
import type { ModuleDefinition } from "@renderer/modules/types";
import { SystemdListPage } from "./systemd-list-page";
import { UnitDetailPage } from "./unit-detail-page";

function SystemdRoutes() {
	return (
		<Routes>
			<Route index element={<SystemdListPage />} />
			<Route path="units/:unit" element={<UnitDetailPage />} />
		</Routes>
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
