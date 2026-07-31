import { HardDrive } from "lucide-react";
import { AnimatedModuleRoutes } from "@renderer/components/layout/animated-module-routes";
import type { ModuleDefinition } from "@renderer/modules/types";
import { DiskDetailPage } from "./disk-detail-page";
import { FilesystemDetailPage } from "./filesystem-detail-page";
import { StorageListPage } from "./storage-list-page";

function StorageRoutes() {
	return (
		<AnimatedModuleRoutes
			routes={[
				{ index: true, element: <StorageListPage /> },
				{ path: "filesystems/:mount", element: <FilesystemDetailPage /> },
				{ path: "disks/:device", element: <DiskDetailPage /> },
			]}
		/>
	);
}

export const storageModule: ModuleDefinition = {
	id: "storage",
	label: "ストレージ",
	icon: HardDrive,
	group: "system",
	order: 26,
	element: StorageRoutes,
};
