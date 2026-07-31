import { authorizedFetch, type NodeAddress } from "@renderer/lib/node-api-client";

export interface AdminUser {
	username: string;
	groups: string[];
}

export async function fetchAdminUsers(node: NodeAddress, token: string): Promise<AdminUser[]> {
	const response = await authorizedFetch(node, token, "/system-settings/admin-privileges/admin-users");
	const { admins } = (await response.json()) as { admins: AdminUser[] };
	return admins;
}

export async function grantAdminPrivilege(node: NodeAddress, token: string, username: string): Promise<void> {
	await authorizedFetch(
		node,
		token,
		`/system-settings/admin-privileges/admin-users/${encodeURIComponent(username)}`,
		{ method: "POST" },
	);
}

export async function revokeAdminPrivilege(node: NodeAddress, token: string, username: string): Promise<void> {
	await authorizedFetch(
		node,
		token,
		`/system-settings/admin-privileges/admin-users/${encodeURIComponent(username)}`,
		{ method: "DELETE" },
	);
}
