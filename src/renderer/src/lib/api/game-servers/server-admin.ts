import {
	type AuthorizedFetchOptions,
	type NodeAddress,
	NodeApiError,
	authorizedFetch,
	baseUrl,
} from "@renderer/lib/node-api-client";

export interface GameServerAdminDetails {
	id: number;
	identifier: string;
	uuid: string;
	name: string;
	description: string | null;
	suspended: boolean;
	userId: number;
	nodeId: number;
	limits: { memory: number; swap: number; disk: number; io: number; cpu: number };
	featureLimits: { databases: number; allocations: number; backups: number };
}

export interface UpdateGameServerDetailsInput {
	name?: string;
	description?: string;
	userId?: number;
}

export interface UpdateGameServerBuildInput {
	memory?: number;
	swap?: number;
	disk?: number;
	io?: number;
	cpu?: number;
	databases?: number;
	allocations?: number;
	backups?: number;
}

function adminPath(identifier: string, suffix = ""): string {
	return `/game-servers/admin/servers/${identifier}${suffix}`;
}

function callAdmin(
	node: NodeAddress,
	token: string,
	identifier: string,
	suffix: string,
	options?: AuthorizedFetchOptions,
): Promise<Response> {
	return authorizedFetch(node, token, adminPath(identifier, suffix), options);
}

/**
 * `authorizedFetch`(`node-api-client.ts`)はGET/POST/DELETEのみに対応しているが、
 * サーバー詳細編集・ビルド設定変更のAPIはPATCHを使うため、同等の認証/エラー処理を
 * ここで再実装する(共有ファイルであるnode-api-client.tsは変更しない方針のため)。
 */
async function patchJson<T>(node: NodeAddress, token: string, identifier: string, suffix: string, body: unknown): Promise<T> {
	let response: Response;
	try {
		response = await fetch(`${baseUrl(node)}${adminPath(identifier, suffix)}`, {
			method: "PATCH",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		});
	} catch {
		throw new NodeApiError("ノードに接続できません。ホスト/ポートやネットワーク(WireGuard等)を確認してください。");
	}
	if (response.status === 401) {
		throw new NodeApiError("アクセストークンが正しくありません。", 401);
	}
	if (!response.ok) {
		let message = `ノードからエラー応答がありました(HTTP ${response.status})`;
		try {
			const data = (await response.clone().json()) as { error?: string };
			if (data.error) message = data.error;
		} catch {
			// レスポンスボディがJSONでない場合はデフォルトメッセージを使う
		}
		throw new NodeApiError(message, response.status);
	}
	return response.json() as Promise<T>;
}

export async function fetchGameServerAdminDetails(
	node: NodeAddress,
	token: string,
	identifier: string,
): Promise<GameServerAdminDetails> {
	const response = await callAdmin(node, token, identifier, "");
	const { server } = (await response.json()) as { server: GameServerAdminDetails };
	return server;
}

export async function updateGameServerDetails(
	node: NodeAddress,
	token: string,
	identifier: string,
	input: UpdateGameServerDetailsInput,
): Promise<GameServerAdminDetails> {
	const { server } = await patchJson<{ server: GameServerAdminDetails }>(node, token, identifier, "/details", input);
	return server;
}

export async function updateGameServerBuild(
	node: NodeAddress,
	token: string,
	identifier: string,
	input: UpdateGameServerBuildInput,
): Promise<GameServerAdminDetails> {
	const { server } = await patchJson<{ server: GameServerAdminDetails }>(node, token, identifier, "/build", input);
	return server;
}

export async function reinstallGameServer(node: NodeAddress, token: string, identifier: string): Promise<void> {
	await callAdmin(node, token, identifier, "/reinstall", { method: "POST" });
}

export async function suspendGameServer(node: NodeAddress, token: string, identifier: string): Promise<void> {
	await callAdmin(node, token, identifier, "/suspend", { method: "POST" });
}

export async function unsuspendGameServer(node: NodeAddress, token: string, identifier: string): Promise<void> {
	await callAdmin(node, token, identifier, "/unsuspend", { method: "POST" });
}

/**
 * サーバー削除は破壊的操作のため、呼び出し元(admin-tab.tsx)で
 * `ConfirmDestructiveDialog`による確認を必須とすること。
 */
export async function deleteGameServer(
	node: NodeAddress,
	token: string,
	identifier: string,
	force = false,
): Promise<void> {
	const suffix = force ? "?force=true" : "";
	await callAdmin(node, token, identifier, suffix, { method: "DELETE" });
}
