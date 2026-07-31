import { Activity } from "lucide-react";
import { Route, Routes } from "react-router-dom";
import type { ModuleDefinition } from "@renderer/modules/types";
import { CpuDetailPage } from "./cpu-detail-page";
import { DiskDetailPage } from "./disk-detail-page";
import { MemoryDetailPage } from "./memory-detail-page";
import { NetworkDetailPage } from "./network-detail-page";
import { OverviewListPage } from "./overview-list-page";

function OverviewRoutes() {
	return (
		<Routes>
			<Route index element={<OverviewListPage />} />
			<Route path="cpu" element={<CpuDetailPage />} />
			<Route path="memory" element={<MemoryDetailPage />} />
			<Route path="disk" element={<DiskDetailPage />} />
			<Route path="network" element={<NetworkDetailPage />} />
		</Routes>
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
