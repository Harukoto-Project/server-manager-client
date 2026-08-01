import { authorizedFetch, type NodeAddress } from "@renderer/lib/node-api-client";

export type AlertMetric = "cpu" | "memory" | "disk";

export interface AlertRule {
	id: string;
	metric: AlertMetric;
	threshold: number;
	diskPath?: string;
	enabled: boolean;
	cooldownMinutes: number;
}

export async function fetchAlertRules(node: NodeAddress, token: string): Promise<AlertRule[]> {
	const response = await authorizedFetch(node, token, "/alerts/rules");
	const { rules } = (await response.json()) as { rules: AlertRule[] };
	return rules;
}

export async function createAlertRule(
	node: NodeAddress,
	token: string,
	rule: Omit<AlertRule, "id">,
): Promise<AlertRule> {
	const response = await authorizedFetch(node, token, "/alerts/rules", {
		method: "POST",
		body: rule,
	});
	return (await response.json()) as AlertRule;
}

export async function updateAlertRule(
	node: NodeAddress,
	token: string,
	id: string,
	rule: Partial<Omit<AlertRule, "id">>,
): Promise<AlertRule> {
	const response = await authorizedFetch(node, token, `/alerts/rules/${id}`, {
		method: "PUT",
		body: rule,
	});
	return (await response.json()) as AlertRule;
}

export async function deleteAlertRule(node: NodeAddress, token: string, id: string): Promise<void> {
	await authorizedFetch(node, token, `/alerts/rules/${id}`, { method: "DELETE" });
}
