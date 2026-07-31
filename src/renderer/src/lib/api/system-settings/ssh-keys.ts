import { authorizedFetch, type NodeAddress } from "@renderer/lib/node-api-client";

export interface SshKeyEntry {
	index: number;
	keyType: string;
	key: string;
	comment: string;
	raw: string;
}

export async function fetchSshKeys(node: NodeAddress, token: string, username: string): Promise<SshKeyEntry[]> {
	const response = await authorizedFetch(node, token, `/system-settings/ssh-keys/${encodeURIComponent(username)}`);
	const { keys } = (await response.json()) as { keys: SshKeyEntry[] };
	return keys;
}

export async function addSshKey(node: NodeAddress, token: string, username: string, key: string): Promise<void> {
	await authorizedFetch(node, token, `/system-settings/ssh-keys/${encodeURIComponent(username)}`, {
		method: "POST",
		body: { key },
	});
}

export async function deleteSshKey(
	node: NodeAddress,
	token: string,
	username: string,
	index: number,
): Promise<void> {
	await authorizedFetch(node, token, `/system-settings/ssh-keys/${encodeURIComponent(username)}/${index}`, {
		method: "DELETE",
	});
}
