import { authorizedFetch, type NodeAddress } from "@renderer/lib/node-api-client";

export interface PterodactylNode {
	id: number;
	uuid: string;
	name: string;
	description: string | null;
	locationId: number;
	fqdn: string;
	scheme: string;
	isMaintenanceMode: boolean;
	memory: number;
	memoryOverallocate: number;
	disk: number;
	diskOverallocate: number;
	allocatedMemory: number;
	allocatedDisk: number;
}

export interface PterodactylNodeConfiguration {
	debug: boolean;
	uuid: string;
	tokenId: string;
	remote: string;
	api: { host: string; port: number; ssl: { enabled: boolean } };
	system: { dataDirectory: string; sftpBindPort: number };
	allowedMounts: string[];
}

export async function fetchPterodactylNodes(node: NodeAddress, token: string): Promise<PterodactylNode[]> {
	const response = await authorizedFetch(node, token, "/game-servers/admin/nodes");
	const { nodes } = (await response.json()) as { nodes: PterodactylNode[] };
	return nodes;
}

export async function fetchPterodactylNodeDetails(
	node: NodeAddress,
	token: string,
	nodeId: number,
): Promise<PterodactylNode> {
	const response = await authorizedFetch(node, token, `/game-servers/admin/nodes/${nodeId}`);
	const { node: detail } = (await response.json()) as { node: PterodactylNode };
	return detail;
}

export async function fetchPterodactylNodeConfiguration(
	node: NodeAddress,
	token: string,
	nodeId: number,
): Promise<PterodactylNodeConfiguration> {
	const response = await authorizedFetch(node, token, `/game-servers/admin/nodes/${nodeId}/configuration`);
	const { configuration } = (await response.json()) as { configuration: PterodactylNodeConfiguration };
	return configuration;
}
