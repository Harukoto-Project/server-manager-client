import { authorizedFetch, type NodeAddress } from "@renderer/lib/node-api-client";

export interface SystemUser {
	username: string;
	uid: number;
	homeDir: string;
	shell: string;
}

export interface SystemGroup {
	name: string;
	gid: number;
	members: string[];
}

export interface CreateSystemUserInput {
	username: string;
	password?: string;
}

export async function fetchSystemUsers(node: NodeAddress, token: string): Promise<SystemUser[]> {
	const response = await authorizedFetch(node, token, "/system-settings/users-groups/users");
	const { users } = (await response.json()) as { users: SystemUser[] };
	return users;
}

export async function fetchSystemGroups(node: NodeAddress, token: string): Promise<SystemGroup[]> {
	const response = await authorizedFetch(node, token, "/system-settings/users-groups/groups");
	const { groups } = (await response.json()) as { groups: SystemGroup[] };
	return groups;
}

export async function createSystemUser(
	node: NodeAddress,
	token: string,
	input: CreateSystemUserInput,
): Promise<void> {
	await authorizedFetch(node, token, "/system-settings/users-groups/users", {
		method: "POST",
		body: input,
	});
}

export async function deleteSystemUser(node: NodeAddress, token: string, username: string): Promise<void> {
	await authorizedFetch(node, token, `/system-settings/users-groups/users/${encodeURIComponent(username)}`, {
		method: "DELETE",
	});
}
