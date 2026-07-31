import { Container } from "lucide-react";
import { Route, Routes } from "react-router-dom";
import type { ModuleDefinition } from "@renderer/modules/types";
import { ContainerDetailPage } from "./container-detail-page";
import { DockerListPage } from "./docker-list-page";

function DockerRoutes() {
	return (
		<Routes>
			<Route index element={<DockerListPage />} />
			<Route path="containers/:containerId" element={<ContainerDetailPage />} />
		</Routes>
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
