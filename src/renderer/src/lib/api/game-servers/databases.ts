import { type NodeAddress, authorizedFetch } from "@renderer/lib/node-api-client";

export interface GameServerDatabase {
	id: string;
	host: { address: string; port: number };
	name: string;
	username: string;
	password: string | null;
	connectionsFrom: string;
	maxConnections: number;
}

export async function fetchGameServerDatabases(
	node: NodeAddress,
	token: string,
	identifier: string,
): Promise<GameServerDatabase[]> {
	const response = await authorizedFetch(node, token, `/game-servers/databases/${identifier}`);
	const { databases } = (await response.json()) as { databases: GameServerDatabase[] };
	return databases;
}

export async function createGameServerDatabase(
	node: NodeAddress,
	token: string,
	identifier: string,
	database: string,
	remote: string,
): Promise<GameServerDatabase> {
	const response = await authorizedFetch(node, token, `/game-servers/databases/${identifier}`, {
		method: "POST",
		body: { database, remote },
	});
	const { database: created } = (await response.json()) as { database: GameServerDatabase };
	return created;
}

export async function rotateGameServerDatabasePassword(
	node: NodeAddress,
	token: string,
	identifier: string,
	databaseId: string,
): Promise<GameServerDatabase> {
	const response = await authorizedFetch(
		node,
		token,
		`/game-servers/databases/${identifier}/${databaseId}/rotate-password`,
		{ method: "POST" },
	);
	const { database } = (await response.json()) as { database: GameServerDatabase };
	return database;
}

export async function deleteGameServerDatabase(
	node: NodeAddress,
	token: string,
	identifier: string,
	databaseId: string,
): Promise<void> {
	await authorizedFetch(node, token, `/game-servers/databases/${identifier}/${databaseId}`, { method: "DELETE" });
}
