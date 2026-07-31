import { type NodeAddress, NodeApiError, authorizedFetch, baseUrl } from "@renderer/lib/node-api-client";

export interface HostsEntry {
	index: number;
	ip: string;
	hostnames: string[];
	comment: string | null;
	raw: string;
	isSystemEntry: boolean;
}

export interface AddHostEntryInput {
	ip: string;
	hostname: string;
	comment?: string;
}

export async function fetchHostsEntries(node: NodeAddress, token: string): Promise<HostsEntry[]> {
	const response = await authorizedFetch(node, token, "/system-settings/name-resolution/hosts");
	const { entries } = (await response.json()) as { entries: HostsEntry[] };
	return entries;
}

export async function addHostsEntry(
	node: NodeAddress,
	token: string,
	input: AddHostEntryInput,
): Promise<{ ok: true }> {
	const response = await authorizedFetch(node, token, "/system-settings/name-resolution/hosts", {
		method: "POST",
		body: input,
	});
	return response.json();
}

export async function deleteHostsEntry(node: NodeAddress, token: string, index: number): Promise<{ ok: true }> {
	const response = await authorizedFetch(node, token, `/system-settings/name-resolution/hosts/${index}`, {
		method: "DELETE",
	});
	return response.json();
}

export { NodeApiError, baseUrl };
