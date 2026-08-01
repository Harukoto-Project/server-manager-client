import { authorizedFetch, baseUrl, NodeApiError, type NodeAddress } from "@renderer/lib/node-api-client";

export interface GameServerStartupVariable {
	name: string;
	description: string;
	envVariable: string;
	defaultValue: string;
	serverValue: string;
	isEditable: boolean;
	rules: string;
}

export interface GameServerStartupInfo {
	startupCommand: string;
	dockerImage: string;
	variables: GameServerStartupVariable[];
}

/**
 * 起動変数更新API(`/game-servers/startup/:identifier/variable`)はPUTで実装されているが、
 * `authorizedFetch`(`node-api-client.ts`)はGET/POST/DELETEしか受け付けないため、
 * ここだけ`authorizedFetch`と同等のエラーハンドリングを持つ簡易版を用意する。
 * `node-api-client.ts`自体は共有ファイルのため編集しない。
 */
async function putJson(node: NodeAddress, token: string, path: string, body: unknown): Promise<Response> {
	let response: Response;
	try {
		response = await fetch(`${baseUrl(node)}${path}`, {
			method: "PUT",
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

export async function fetchGameServerStartup(
	node: NodeAddress,
	token: string,
	identifier: string,
): Promise<GameServerStartupInfo> {
	const response = await authorizedFetch(node, token, `/game-servers/startup/${identifier}`);
	const { startup } = (await response.json()) as { startup: GameServerStartupInfo };
	return startup;
}

export async function updateGameServerStartupVariable(
	node: NodeAddress,
	token: string,
	identifier: string,
	key: string,
	value: string,
): Promise<GameServerStartupVariable> {
	const response = await putJson(node, token, `/game-servers/startup/${identifier}/variable`, { key, value });
	const { variable } = (await response.json()) as { variable: GameServerStartupVariable };
	return variable;
}
