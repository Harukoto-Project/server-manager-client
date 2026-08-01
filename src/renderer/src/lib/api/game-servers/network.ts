import { type NodeAddress, NodeApiError, authorizedFetch, baseUrl } from "@renderer/lib/node-api-client";

export interface GameServerAllocation {
	id: number;
	ip: string;
	ipAlias: string | null;
	port: number;
	notes: string | null;
	isDefault: boolean;
}

/**
 * `node-api-client.ts`の`authorizedFetch`はGET/POST/DELETEのみ対応のため、
 * メモ更新(PATCH)はここで同等のエラーハンドリングを持つ専用フェッチヘルパーを用意する
 * (共有ファイルは変更しない方針のため)。
 */
async function authorizedPatch(node: NodeAddress, token: string, path: string, body: unknown): Promise<Response> {
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

export async function fetchAllocations(
	node: NodeAddress,
	token: string,
	identifier: string,
): Promise<GameServerAllocation[]> {
	const response = await authorizedFetch(node, token, `/game-servers/network/${identifier}`);
	const { allocations } = (await response.json()) as { allocations: GameServerAllocation[] };
	return allocations;
}

export async function assignAllocation(
	node: NodeAddress,
	token: string,
	identifier: string,
): Promise<GameServerAllocation> {
	const response = await authorizedFetch(node, token, `/game-servers/network/${identifier}`, { method: "POST" });
	const { allocation } = (await response.json()) as { allocation: GameServerAllocation };
	return allocation;
}

export async function setAllocationNotes(
	node: NodeAddress,
	token: string,
	identifier: string,
	allocationId: number,
	notes: string,
): Promise<GameServerAllocation> {
	const response = await authorizedPatch(node, token, `/game-servers/network/${identifier}/${allocationId}`, {
		notes,
	});
	const { allocation } = (await response.json()) as { allocation: GameServerAllocation };
	return allocation;
}

export async function setPrimaryAllocation(
	node: NodeAddress,
	token: string,
	identifier: string,
	allocationId: number,
): Promise<void> {
	await authorizedFetch(node, token, `/game-servers/network/${identifier}/${allocationId}/primary`, {
		method: "POST",
	});
}

export async function unassignAllocation(
	node: NodeAddress,
	token: string,
	identifier: string,
	allocationId: number,
): Promise<void> {
	await authorizedFetch(node, token, `/game-servers/network/${identifier}/${allocationId}`, { method: "DELETE" });
}

export { NodeApiError };
