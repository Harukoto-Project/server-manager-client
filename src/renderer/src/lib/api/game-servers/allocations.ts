import { authorizedFetch, type NodeAddress } from "@renderer/lib/node-api-client";

export interface PterodactylNodeAllocation {
	id: number;
	ip: string;
	ipAlias: string | null;
	port: number;
	notes: string | null;
	assigned: boolean;
}

export interface CreatePterodactylAllocationInput {
	ip: string;
	ports: string[];
	alias?: string;
}

export async function fetchPterodactylAllocations(
	node: NodeAddress,
	token: string,
	pterodactylNodeId: number,
): Promise<PterodactylNodeAllocation[]> {
	const response = await authorizedFetch(node, token, `/game-servers/admin/allocations/${pterodactylNodeId}`);
	const { allocations } = (await response.json()) as { allocations: PterodactylNodeAllocation[] };
	return allocations;
}

export async function createPterodactylAllocations(
	node: NodeAddress,
	token: string,
	pterodactylNodeId: number,
	input: CreatePterodactylAllocationInput,
): Promise<PterodactylNodeAllocation[]> {
	const response = await authorizedFetch(node, token, `/game-servers/admin/allocations/${pterodactylNodeId}`, {
		method: "POST",
		body: input,
	});
	const { allocations } = (await response.json()) as { allocations: PterodactylNodeAllocation[] };
	return allocations;
}

export async function removePterodactylAllocation(
	node: NodeAddress,
	token: string,
	pterodactylNodeId: number,
	allocationId: number,
): Promise<void> {
	await authorizedFetch(node, token, `/game-servers/admin/allocations/${pterodactylNodeId}/${allocationId}`, {
		method: "DELETE",
	});
}
