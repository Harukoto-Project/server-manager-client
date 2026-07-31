import { HardDrive } from "lucide-react";
import { Route, Routes } from "react-router-dom";
import type { ModuleDefinition } from "@renderer/modules/types";
import { DiskDetailPage } from "./disk-detail-page";
import { FilesystemDetailPage } from "./filesystem-detail-page";
import { StorageListPage } from "./storage-list-page";

function StorageRoutes() {
	return (
		<Routes>
			<Route index element={<StorageListPage />} />
			<Route path="filesystems/:mount" element={<FilesystemDetailPage />} />
			<Route path="disks/:device" element={<DiskDetailPage />} />
		</Routes>
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
