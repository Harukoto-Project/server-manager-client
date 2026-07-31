import { type NodeAddress, NodeApiError, authorizedFetch, baseUrl } from "@renderer/lib/node-api-client";

export type LogrotateFrequency = "daily" | "weekly" | "monthly" | "yearly";

export interface LogrotateConfigSummary {
	name: string;
	rotate: number | null;
	frequency: LogrotateFrequency | null;
	maxsize: string | null;
}

export interface UpdateLogrotateConfigInput {
	rotate?: number;
	frequency?: LogrotateFrequency;
}

export async function fetchLogrotateConfigs(node: NodeAddress, token: string): Promise<LogrotateConfigSummary[]> {
	const response = await authorizedFetch(node, token, "/system-settings/log-management/logrotate-configs");
	const { configs } = (await response.json()) as { configs: LogrotateConfigSummary[] };
	return configs;
}

export async function updateLogrotateConfig(
	node: NodeAddress,
	token: string,
	name: string,
	input: UpdateLogrotateConfigInput,
): Promise<{ ok: true }> {
	const response = await authorizedFetch(
		node,
		token,
		`/system-settings/log-management/logrotate-configs/${encodeURIComponent(name)}`,
		{ method: "POST", body: input },
	);
	return response.json();
}

export { NodeApiError, baseUrl };
