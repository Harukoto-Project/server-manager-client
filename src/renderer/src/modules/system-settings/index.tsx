import { Settings } from "lucide-react";
import { AnimatedModuleRoutes } from "@renderer/components/layout/animated-module-routes";
import type { ModuleDefinition } from "@renderer/modules/types";
import { CategoryDetailPage } from "./category-detail-page";
import { SystemSettingsListPage } from "./system-settings-list-page";

function SystemSettingsRoutes() {
	return (
		<AnimatedModuleRoutes
			routes={[
				{ index: true, element: <SystemSettingsListPage /> },
				{ path: "settings/:category", element: <CategoryDetailPage /> },
			]}
		/>
	);
}

export const systemSettingsModule: ModuleDefinition = {
	id: "system-settings",
	label: "システム設定",
	icon: Settings,
	group: "system",
	order: 30,
	element: SystemSettingsRoutes,
};
