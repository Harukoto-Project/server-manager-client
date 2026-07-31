import { type NodeAddress, NodeApiError, authorizedFetch, baseUrl } from "@renderer/lib/node-api-client";

export interface SwapDeviceInfo {
	name: string;
	type: string;
	sizeBytes: number;
	usedBytes: number;
	priority: number;
}

export interface SwapStatus {
	devices: SwapDeviceInfo[];
	totalBytes: number;
	usedBytes: number;
	freeBytes: number;
}

export async function fetchSwapStatus(node: NodeAddress, token: string): Promise<SwapStatus> {
	const response = await authorizedFetch(node, token, "/system-settings/swap-memory/swap");
	return response.json();
}

export async function createSwapFile(node: NodeAddress, token: string, sizeMb: number): Promise<{ ok: true }> {
	const response = await authorizedFetch(node, token, "/system-settings/swap-memory/swap", {
		method: "POST",
		body: { sizeMb },
	});
	return response.json();
}

export async function deleteSwapFile(node: NodeAddress, token: string): Promise<{ ok: true }> {
	const response = await authorizedFetch(node, token, "/system-settings/swap-memory/swap", {
		method: "DELETE",
	});
	return response.json();
}

export { NodeApiError, baseUrl };
