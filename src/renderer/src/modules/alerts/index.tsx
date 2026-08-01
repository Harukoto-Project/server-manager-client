import { BellRing } from "lucide-react";
import type { ModuleDefinition } from "@renderer/modules/types";
import { AlertRulesPage } from "./alert-rules-page";

export const alertsModule: ModuleDefinition = {
	id: "alerts",
	label: "アラートルール",
	icon: BellRing,
	group: "system",
	order: 40,
	element: AlertRulesPage,
};
