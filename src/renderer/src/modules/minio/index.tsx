import { Database } from "lucide-react";
import type { ModuleDefinition } from "@renderer/modules/types";
import { MinioPage } from "./minio-page";

export const minioModule: ModuleDefinition = {
	id: "minio",
	label: "MinIO",
	icon: Database,
	group: "system",
	order: 28,
	element: MinioPage,
};
