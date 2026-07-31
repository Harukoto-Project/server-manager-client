import { authorizedFetch, type NodeAddress } from "@renderer/lib/node-api-client";

export interface SshConfigSummary {
	port: string;
	permitRootLogin: string;
	passwordAuthentication: string;
}

export interface UpdateSshConfigInput {
	port?: number;
	permitRootLogin?: "yes" | "no" | "prohibit-password" | "forced-commands-only";
	passwordAuthentication?: "yes" | "no";
}

export async function fetchSshConfig(node: NodeAddress, token: string): Promise<SshConfigSummary> {
	const response = await authorizedFetch(node, token, "/system-settings/remote-access/ssh-config");
	return response.json();
}

export async function updateSshConfig(
	node: NodeAddress,
	token: string,
	input: UpdateSshConfigInput,
): Promise<SshConfigSummary> {
	const response = await authorizedFetch(node, token, "/system-settings/remote-access/ssh-config", {
		method: "POST",
		body: input,
	});
	const { settings } = (await response.json()) as { settings: SshConfigSummary };
	return settings;
}
