import { FolderOpen } from "lucide-react";
import { AnimatedModuleRoutes } from "@renderer/components/layout/animated-module-routes";
import type { ModuleDefinition } from "@renderer/modules/types";
import { FileBrowserPage } from "./file-browser-page";
import { FileEditorPage } from "./file-editor-page";

function FileManagerRoutes() {
	return (
		<AnimatedModuleRoutes
			routes={[
				{ index: true, element: <FileBrowserPage /> },
				{ path: "editor", element: <FileEditorPage /> },
			]}
		/>
	);
}

export const fileManagerModule: ModuleDefinition = {
	id: "file-manager",
	label: "ファイルマネージャー",
	icon: FolderOpen,
	group: "system",
	order: 60,
	element: FileManagerRoutes,
};
