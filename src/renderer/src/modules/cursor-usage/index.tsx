import { Calculator } from "lucide-react";
import { AnimatedModuleRoutes } from "@renderer/components/layout/animated-module-routes";
import type { ModuleDefinition } from "@renderer/modules/types";
import { CursorUsagePage } from "./cursor-usage-page";

function CursorUsageRoutes() {
	return <AnimatedModuleRoutes routes={[{ index: true, element: <CursorUsagePage /> }]} />;
}

export const cursorUsageModule: ModuleDefinition = {
	id: "cursor-usage",
	label: "Cursor使用量の推定",
	icon: Calculator,
	group: "tools",
	order: 0,
	element: CursorUsageRoutes,
};
