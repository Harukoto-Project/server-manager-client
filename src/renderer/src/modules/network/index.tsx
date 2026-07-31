import { Network } from "lucide-react";
import { Route, Routes } from "react-router-dom";
import type { ModuleDefinition } from "@renderer/modules/types";
import { InterfaceDetailPage } from "./interface-detail-page";
import { NetworkListPage } from "./network-list-page";

function NetworkRoutes() {
	return (
		<Routes>
			<Route index element={<NetworkListPage />} />
			<Route path="interfaces/:name" element={<InterfaceDetailPage />} />
		</Routes>
	);
}

export const networkModule: ModuleDefinition = {
	id: "network",
	label: "ネットワーク",
	icon: Network,
	group: "system",
	order: 25,
	element: NetworkRoutes,
};
