import { type NodeAddress, NodeApiError, authorizedFetch, baseUrl } from "@renderer/lib/node-api-client";

export interface FstabEntry {
	index: number;
	device: string;
	mountPoint: string;
	fsType: string;
	options: string;
	dump: number;
	pass: number;
	raw: string;
}

export interface BlockDeviceInfo {
	name: string;
	path: string;
	fsType: string | null;
	sizeBytes: number;
	mountPoint: string | null;
	type: string;
	uuid: string | null;
	label: string | null;
	model: string | null;
	children: BlockDeviceInfo[];
}

export interface AddFstabEntryInput {
	device: string;
	mountPoint: string;
	fsType: string;
	options?: string;
	dump?: number;
	pass?: number;
}

export async function fetchFstabEntries(node: NodeAddress, token: string): Promise<FstabEntry[]> {
	const response = await authorizedFetch(node, token, "/system-settings/disk-mounts/fstab");
	const { entries } = (await response.json()) as { entries: FstabEntry[] };
	return entries;
}

export async function fetchBlockDevices(node: NodeAddress, token: string): Promise<BlockDeviceInfo[]> {
	const response = await authorizedFetch(node, token, "/system-settings/disk-mounts/block-devices");
	const { devices } = (await response.json()) as { devices: BlockDeviceInfo[] };
	return devices;
}

export async function addFstabEntry(
	node: NodeAddress,
	token: string,
	input: AddFstabEntryInput,
): Promise<{ ok: true; index: number }> {
	const response = await authorizedFetch(node, token, "/system-settings/disk-mounts/fstab", {
		method: "POST",
		body: input,
	});
	return response.json();
}

export async function deleteFstabEntry(node: NodeAddress, token: string, index: number): Promise<{ ok: true }> {
	const response = await authorizedFetch(node, token, `/system-settings/disk-mounts/fstab/${index}`, {
		method: "DELETE",
	});
	return response.json();
}

export { NodeApiError, baseUrl };
