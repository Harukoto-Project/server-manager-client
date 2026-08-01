import { authorizedFetch, type NodeAddress } from "@renderer/lib/node-api-client";

export interface PterodactylMount {
	id: number;
	name: string;
	description: string | null;
	source: string;
	target: string;
	readOnly: boolean;
}

export interface PterodactylRole {
	id: number;
	name: string;
	description: string | null;
	permissions: string[];
}

export interface PterodactylMountsListResult {
	available: boolean;
	mounts: PterodactylMount[];
}

export interface PterodactylRolesListResult {
	available: boolean;
	roles: PterodactylRole[];
}

export interface CreatePterodactylMountInput {
	name: string;
	description: string;
	source: string;
	target: string;
	readOnly: boolean;
}

const BASE_PATH = "/game-servers/admin/mounts-roles";

export async function fetchPterodactylMounts(node: NodeAddress, token: string): Promise<PterodactylMountsListResult> {
	const response = await authorizedFetch(node, token, `${BASE_PATH}/mounts`);
	return response.json();
}

export async function createPterodactylMount(
	node: NodeAddress,
	token: string,
	input: CreatePterodactylMountInput,
): Promise<PterodactylMount> {
	const response = await authorizedFetch(node, token, `${BASE_PATH}/mounts`, { method: "POST", body: input });
	const { mount } = (await response.json()) as { mount: PterodactylMount };
	return mount;
}

export async function removePterodactylMount(node: NodeAddress, token: string, mountId: number): Promise<void> {
	await authorizedFetch(node, token, `${BASE_PATH}/mounts/${mountId}`, { method: "DELETE" });
}

export async function fetchPterodactylRoles(node: NodeAddress, token: string): Promise<PterodactylRolesListResult> {
	const response = await authorizedFetch(node, token, `${BASE_PATH}/roles`);
	return response.json();
}
