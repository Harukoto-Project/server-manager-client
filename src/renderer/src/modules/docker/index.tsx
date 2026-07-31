import { Container } from "lucide-react";
import { AnimatedModuleRoutes } from "@renderer/components/layout/animated-module-routes";
import type { ModuleDefinition } from "@renderer/modules/types";
import { ContainerDetailPage } from "./container-detail-page";
import { DockerListPage } from "./docker-list-page";

function DockerRoutes() {
	return (
		<AnimatedModuleRoutes
			routes={[
				{ index: true, element: <DockerListPage /> },
				{ path: "containers/:containerId", element: <ContainerDetailPage /> },
			]}
		/>
	);
}

export const dockerModule: ModuleDefinition = {
	id: "docker",
	label: "Docker",
	icon: Container,
	group: "operations",
	order: 10,
	element: DockerRoutes,
};
