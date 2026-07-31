import { authorizedFetch, type NodeAddress } from "@renderer/lib/node-api-client";

export interface IntrusionPreventionStatus {
	installed: boolean;
	active: boolean;
	enabled: boolean;
	jails: string[];
	raw: string;
}

export async function fetchIntrusionPreventionStatus(
	node: NodeAddress,
	token: string,
): Promise<IntrusionPreventionStatus> {
	const response = await authorizedFetch(node, token, "/system-settings/intrusion-prevention/status");
	return response.json();
}

export async function installIntrusionPrevention(node: NodeAddress, token: string): Promise<void> {
	await authorizedFetch(node, token, "/system-settings/intrusion-prevention/install", { method: "POST" });
}

export async function enableIntrusionPrevention(node: NodeAddress, token: string): Promise<void> {
	await authorizedFetch(node, token, "/system-settings/intrusion-prevention/enable", { method: "POST" });
}

export async function disableIntrusionPrevention(node: NodeAddress, token: string): Promise<void> {
	await authorizedFetch(node, token, "/system-settings/intrusion-prevention/disable", { method: "POST" });
}
