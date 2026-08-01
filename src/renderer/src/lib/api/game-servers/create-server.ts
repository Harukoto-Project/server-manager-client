import { type NodeAddress, authorizedFetch } from "@renderer/lib/node-api-client";

/**
 * サーバー作成フォーム専用の簡易ノード情報。
 * 別グループが並行実装する「ノード管理」(`lib/api/game-servers/nodes.ts`、まだ存在しない可能性あり)とは
 * 依存を避けるため独立した自己完結的な実装(API側も`create-server.ts`ルート内の専用エンドポイントを利用する)。
 */
export interface CreateServerNodeOption {
	id: number;
	name: string;
	fqdn: string;
	memoryMb: number;
	memoryOverallocateMb: number;
	diskMb: number;
	diskOverallocateMb: number;
	isMaintenanceMode: boolean;
}

/**
 * サーバー作成フォーム専用の簡易アロケーション情報(未割り当てのもののみ)。
 * 別グループが並行実装する「アロケーション管理」(`lib/api/game-servers/allocations.ts`)とは独立。
 */
export interface CreateServerAllocationOption {
	id: number;
	ip: string;
	ipAlias: string | null;
	port: number;
}

export interface CreateGameServerLimits {
	memory: number;
	swap: number;
	disk: number;
	io: number;
	cpu: number;
}

export interface CreateGameServerFeatureLimits {
	databases: number;
	allocations: number;
	backups: number;
}

export interface CreateGameServerInput {
	name: string;
	description?: string;
	userId: number;
	eggId: number;
	dockerImage: string;
	startup: string;
	environment: Record<string, string>;
	limits: CreateGameServerLimits;
	featureLimits: CreateGameServerFeatureLimits;
	allocation: { defaultAllocationId: number };
	startOnCompletion: boolean;
}

export interface CreatedGameServer {
	id: number;
	identifier: string;
	uuid: string;
}

export async function listNodesForServerCreation(node: NodeAddress, token: string): Promise<CreateServerNodeOption[]> {
	const response = await authorizedFetch(node, token, "/game-servers/admin/create-server/nodes");
	const { nodes } = (await response.json()) as { nodes: CreateServerNodeOption[] };
	return nodes;
}

export async function listAvailableAllocationsForNode(
	node: NodeAddress,
	token: string,
	pterodactylNodeId: number,
): Promise<CreateServerAllocationOption[]> {
	const response = await authorizedFetch(
		node,
		token,
		`/game-servers/admin/create-server/nodes/${pterodactylNodeId}/allocations`,
	);
	const { allocations } = (await response.json()) as { allocations: CreateServerAllocationOption[] };
	return allocations;
}

export async function createGameServer(
	node: NodeAddress,
	token: string,
	input: CreateGameServerInput,
): Promise<CreatedGameServer> {
	const response = await authorizedFetch(node, token, "/game-servers/admin/create-server", {
		method: "POST",
		body: input,
	});
	const { server } = (await response.json()) as { server: CreatedGameServer };
	return server;
}
