import { type NodeAddress, NodeApiError, authorizedFetch, baseUrl } from "@renderer/lib/node-api-client";

export interface GameServerNest {
	id: number;
	name: string;
	description: string | null;
}

export interface GameServerEggVariable {
	id: number;
	name: string;
	description: string | null;
	envVariable: string;
	defaultValue: string;
	isViewable: boolean;
	isEditable: boolean;
	rules: string;
}

export interface GameServerEgg {
	id: number;
	nestId: number;
	name: string;
	description: string | null;
	dockerImage: string;
	dockerImages: Record<string, string>;
	startup: string;
	variables: GameServerEggVariable[];
}

/**
 * Egg変数更新API(`/game-servers/admin/nests-eggs/nests/:nestId/eggs/:eggId/variables/:variableId`)はPATCHで
 * 実装されているが、`authorizedFetch`(`node-api-client.ts`)はGET/POST/DELETEしか受け付けないため、
 * ここだけ`authorizedFetch`と同等のエラーハンドリングを持つ簡易版を用意する。
 * `node-api-client.ts`自体は共有ファイルのため編集しない。
 */
async function patchJson(node: NodeAddress, token: string, path: string, body: unknown): Promise<Response> {
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
	return response;
}

export async function fetchNests(node: NodeAddress, token: string): Promise<GameServerNest[]> {
	const response = await authorizedFetch(node, token, "/game-servers/admin/nests-eggs/nests");
	const { nests } = (await response.json()) as { nests: GameServerNest[] };
	return nests;
}

export async function fetchEggs(node: NodeAddress, token: string, nestId: number): Promise<GameServerEgg[]> {
	const response = await authorizedFetch(node, token, `/game-servers/admin/nests-eggs/nests/${nestId}/eggs`);
	const { eggs } = (await response.json()) as { eggs: GameServerEgg[] };
	return eggs;
}

export async function fetchEgg(node: NodeAddress, token: string, nestId: number, eggId: number): Promise<GameServerEgg> {
	const response = await authorizedFetch(node, token, `/game-servers/admin/nests-eggs/nests/${nestId}/eggs/${eggId}`);
	const { egg } = (await response.json()) as { egg: GameServerEgg };
	return egg;
}

export async function updateEggVariable(
	node: NodeAddress,
	token: string,
	nestId: number,
	eggId: number,
	variableId: number,
	defaultValue: string,
): Promise<GameServerEggVariable> {
	const response = await patchJson(
		node,
		token,
		`/game-servers/admin/nests-eggs/nests/${nestId}/eggs/${eggId}/variables/${variableId}`,
		{ defaultValue },
	);
	const { variable } = (await response.json()) as { variable: GameServerEggVariable };
	return variable;
}

export async function importEgg(node: NodeAddress, token: string, nestId: number, eggJson: string): Promise<GameServerEgg> {
	const response = await authorizedFetch(node, token, `/game-servers/admin/nests-eggs/nests/${nestId}/eggs/import`, {
		method: "POST",
		body: { eggJson },
	});
	const { egg } = (await response.json()) as { egg: GameServerEgg };
	return egg;
}

export async function exportEgg(node: NodeAddress, token: string, nestId: number, eggId: number): Promise<string> {
	const response = await authorizedFetch(node, token, `/game-servers/admin/nests-eggs/nests/${nestId}/eggs/${eggId}/export`);
	const { eggJson } = (await response.json()) as { eggJson: string };
	return eggJson;
}

export async function deleteEgg(node: NodeAddress, token: string, nestId: number, eggId: number): Promise<void> {
	await authorizedFetch(node, token, `/game-servers/admin/nests-eggs/nests/${nestId}/eggs/${eggId}`, {
		method: "DELETE",
	});
}
