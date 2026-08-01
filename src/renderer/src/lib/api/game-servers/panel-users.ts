import { NodeApiError, authorizedFetch, baseUrl, type NodeAddress } from "@renderer/lib/node-api-client";

export interface PterodactylPanelUser {
	id: number;
	externalId: string | null;
	uuid: string;
	username: string;
	email: string;
	firstName: string;
	lastName: string;
	isRootAdmin: boolean;
	is2faEnabled: boolean;
}

export interface CreatePterodactylPanelUserInput {
	email: string;
	username: string;
	firstName: string;
	lastName: string;
	password?: string;
}

export type UpdatePterodactylPanelUserInput = Partial<CreatePterodactylPanelUserInput>;

const BASE_PATH = "/game-servers/admin/panel-users";

/**
 * `authorizedFetch`(`node-api-client.ts`)はGET/POST/DELETEのみに対応しているが、
 * パネルユーザー更新のAPIはPATCHを使うため、同等の認証/エラー処理をここで再実装する
 * (共有ファイルであるnode-api-client.tsは変更しない方針のため)。
 */
async function patchJson<T>(node: NodeAddress, token: string, path: string, body: unknown): Promise<T> {
	let response: Response;
	try {
		response = await fetch(`${baseUrl(node)}${path}`, {
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

export async function fetchPterodactylPanelUsers(node: NodeAddress, token: string): Promise<PterodactylPanelUser[]> {
	const response = await authorizedFetch(node, token, BASE_PATH);
	const { users } = (await response.json()) as { users: PterodactylPanelUser[] };
	return users;
}

export async function createPterodactylPanelUser(
	node: NodeAddress,
	token: string,
	input: CreatePterodactylPanelUserInput,
): Promise<PterodactylPanelUser> {
	const response = await authorizedFetch(node, token, BASE_PATH, { method: "POST", body: input });
	const { user } = (await response.json()) as { user: PterodactylPanelUser };
	return user;
}

export async function updatePterodactylPanelUser(
	node: NodeAddress,
	token: string,
	userId: number,
	input: UpdatePterodactylPanelUserInput,
): Promise<PterodactylPanelUser> {
	const { user } = await patchJson<{ user: PterodactylPanelUser }>(node, token, `${BASE_PATH}/${userId}`, input);
	return user;
}

export async function removePterodactylPanelUser(node: NodeAddress, token: string, userId: number): Promise<void> {
	await authorizedFetch(node, token, `${BASE_PATH}/${userId}`, { method: "DELETE" });
}
