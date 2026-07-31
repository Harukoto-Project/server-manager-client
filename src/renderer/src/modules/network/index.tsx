import { Network } from "lucide-react";
import { AnimatedModuleRoutes } from "@renderer/components/layout/animated-module-routes";
import type { ModuleDefinition } from "@renderer/modules/types";
import { InterfaceDetailPage } from "./interface-detail-page";
import { NetworkListPage } from "./network-list-page";

function NetworkRoutes() {
	return (
		<AnimatedModuleRoutes
			routes={[
				{ index: true, element: <NetworkListPage /> },
				{ path: "interfaces/:name", element: <InterfaceDetailPage /> },
			]}
		/>
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
