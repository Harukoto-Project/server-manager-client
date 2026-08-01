import { type NodeAddress, authorizedFetch } from "@renderer/lib/node-api-client";

export interface GameServerBackup {
	uuid: string;
	name: string;
	ignoredFiles: string[];
	isSuccessful: boolean;
	isLocked: boolean;
	checksum: string | null;
	bytes: number;
	createdAt: string;
	completedAt: string | null;
}

export async function fetchGameServerBackups(
	node: NodeAddress,
	token: string,
	identifier: string,
): Promise<GameServerBackup[]> {
	const response = await authorizedFetch(node, token, `/game-servers/backups/${identifier}`);
	const { backups } = (await response.json()) as { backups: GameServerBackup[] };
	return backups;
}

export async function createGameServerBackup(
	node: NodeAddress,
	token: string,
	identifier: string,
	name: string,
	ignoredFiles: string,
): Promise<GameServerBackup> {
	const response = await authorizedFetch(node, token, `/game-servers/backups/${identifier}`, {
		method: "POST",
		body: { name: name || undefined, ignoredFiles },
	});
	const { backup } = (await response.json()) as { backup: GameServerBackup };
	return backup;
}

export async function fetchGameServerBackupDownloadUrl(
	node: NodeAddress,
	token: string,
	identifier: string,
	backupUuid: string,
): Promise<string> {
	const response = await authorizedFetch(node, token, `/game-servers/backups/${identifier}/${backupUuid}/download`);
	const { url } = (await response.json()) as { url: string };
	return url;
}

export async function restoreGameServerBackup(
	node: NodeAddress,
	token: string,
	identifier: string,
	backupUuid: string,
	truncate: boolean,
): Promise<void> {
	await authorizedFetch(node, token, `/game-servers/backups/${identifier}/${backupUuid}/restore`, {
		method: "POST",
		body: { truncate },
	});
}

export async function toggleGameServerBackupLock(
	node: NodeAddress,
	token: string,
	identifier: string,
	backupUuid: string,
): Promise<GameServerBackup> {
	const response = await authorizedFetch(node, token, `/game-servers/backups/${identifier}/${backupUuid}/lock`, {
		method: "POST",
	});
	const { backup } = (await response.json()) as { backup: GameServerBackup };
	return backup;
}

export async function deleteGameServerBackup(
	node: NodeAddress,
	token: string,
	identifier: string,
	backupUuid: string,
): Promise<void> {
	await authorizedFetch(node, token, `/game-servers/backups/${identifier}/${backupUuid}`, { method: "DELETE" });
}
