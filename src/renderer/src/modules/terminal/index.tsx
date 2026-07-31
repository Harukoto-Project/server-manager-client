import { TerminalSquare } from "lucide-react";
import { AnimatedModuleRoutes } from "@renderer/components/layout/animated-module-routes";
import type { ModuleDefinition } from "@renderer/modules/types";
import { TerminalPage } from "./terminal-page";

function TerminalRoutes() {
	return <AnimatedModuleRoutes routes={[{ index: true, element: <TerminalPage /> }]} />;
}

export const terminalModule: ModuleDefinition = {
	id: "terminal",
	label: "ターミナル",
	icon: TerminalSquare,
	group: "system",
	order: 10,
	element: TerminalRoutes,
};
