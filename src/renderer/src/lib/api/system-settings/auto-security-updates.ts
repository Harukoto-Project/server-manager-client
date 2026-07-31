import { authorizedFetch, type NodeAddress } from "@renderer/lib/node-api-client";

export interface AutoSecurityUpdatesStatus {
	installed: boolean;
	configExists: boolean;
	updatePackageListsEnabled: boolean;
	unattendedUpgradeEnabled: boolean;
	raw: string;
}

export async function fetchAutoSecurityUpdatesStatus(
	node: NodeAddress,
	token: string,
): Promise<AutoSecurityUpdatesStatus> {
	const response = await authorizedFetch(node, token, "/system-settings/auto-security-updates/status");
	return response.json();
}

export async function enableAutoSecurityUpdates(node: NodeAddress, token: string): Promise<void> {
	await authorizedFetch(node, token, "/system-settings/auto-security-updates/enable", { method: "POST" });
}

export async function disableAutoSecurityUpdates(node: NodeAddress, token: string): Promise<void> {
	await authorizedFetch(node, token, "/system-settings/auto-security-updates/disable", { method: "POST" });
}
