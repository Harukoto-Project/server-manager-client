import { Activity } from "lucide-react";
import { AnimatedModuleRoutes } from "@renderer/components/layout/animated-module-routes";
import type { ModuleDefinition } from "@renderer/modules/types";
import { CpuDetailPage } from "./cpu-detail-page";
import { DiskDetailPage } from "./disk-detail-page";
import { MemoryDetailPage } from "./memory-detail-page";
import { NetworkDetailPage } from "./network-detail-page";
import { OverviewListPage } from "./overview-list-page";

function OverviewRoutes() {
	return (
		<AnimatedModuleRoutes
			routes={[
				{ index: true, element: <OverviewListPage /> },
				{ path: "cpu", element: <CpuDetailPage /> },
				{ path: "memory", element: <MemoryDetailPage /> },
				{ path: "disk", element: <DiskDetailPage /> },
				{ path: "network", element: <NetworkDetailPage /> },
			]}
		/>
	);
}

export const overviewModule: ModuleDefinition = {
	id: "overview",
	label: "概要",
	icon: Activity,
	group: "overview",
	order: 0,
	element: OverviewRoutes,
};
