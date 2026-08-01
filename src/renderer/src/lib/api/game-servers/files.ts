import { authorizedFetch, baseUrl, NodeApiError, type NodeAddress } from "@renderer/lib/node-api-client";

export interface GameServerFile {
	name: string;
	mode: string;
	modeBits: string;
	size: number;
	isFile: boolean;
	isSymlink: boolean;
	mimetype: string;
	createdAt: string;
	modifiedAt: string;
}

/**
 * リネームAPI(`/game-servers/files/:identifier/rename`)はPUTで実装されているが、
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

export async function fetchGameServerFiles(
	node: NodeAddress,
	token: string,
	identifier: string,
	directory: string,
): Promise<GameServerFile[]> {
	const response = await authorizedFetch(
		node,
		token,
		`/game-servers/files/${identifier}/list?directory=${encodeURIComponent(directory)}`,
	);
	const { files } = (await response.json()) as { files: GameServerFile[] };
	return files;
}

export async function fetchGameServerFileContents(
	node: NodeAddress,
	token: string,
	identifier: string,
	file: string,
): Promise<string> {
	const response = await authorizedFetch(
		node,
		token,
		`/game-servers/files/${identifier}/contents?file=${encodeURIComponent(file)}`,
	);
	const { content } = (await response.json()) as { content: string };
	return content;
}

export async function writeGameServerFileContents(
	node: NodeAddress,
	token: string,
	identifier: string,
	file: string,
	content: string,
): Promise<void> {
	await authorizedFetch(node, token, `/game-servers/files/${identifier}/write?file=${encodeURIComponent(file)}`, {
		method: "POST",
		body: { content },
	});
}

export async function renameGameServerFile(
	node: NodeAddress,
	token: string,
	identifier: string,
	root: string,
	files: Array<{ from: string; to: string }>,
): Promise<void> {
	await putJson(node, token, `/game-servers/files/${identifier}/rename`, { root, files });
}

export async function copyGameServerFile(
	node: NodeAddress,
	token: string,
	identifier: string,
	location: string,
): Promise<void> {
	await authorizedFetch(node, token, `/game-servers/files/${identifier}/copy`, {
		method: "POST",
		body: { location },
	});
}

export async function compressGameServerFiles(
	node: NodeAddress,
	token: string,
	identifier: string,
	root: string,
	files: string[],
): Promise<GameServerFile> {
	const response = await authorizedFetch(node, token, `/game-servers/files/${identifier}/compress`, {
		method: "POST",
		body: { root, files },
	});
	const { file } = (await response.json()) as { file: GameServerFile };
	return file;
}

export async function decompressGameServerFile(
	node: NodeAddress,
	token: string,
	identifier: string,
	root: string,
	file: string,
): Promise<void> {
	await authorizedFetch(node, token, `/game-servers/files/${identifier}/decompress`, {
		method: "POST",
		body: { root, file },
	});
}

export async function deleteGameServerFiles(
	node: NodeAddress,
	token: string,
	identifier: string,
	root: string,
	files: string[],
): Promise<void> {
	await authorizedFetch(node, token, `/game-servers/files/${identifier}/delete`, {
		method: "POST",
		body: { root, files },
	});
}

export async function createGameServerFolder(
	node: NodeAddress,
	token: string,
	identifier: string,
	root: string,
	name: string,
): Promise<void> {
	await authorizedFetch(node, token, `/game-servers/files/${identifier}/create-folder`, {
		method: "POST",
		body: { root, name },
	});
}

export async function fetchGameServerFileDownloadUrl(
	node: NodeAddress,
	token: string,
	identifier: string,
	file: string,
): Promise<string> {
	const response = await authorizedFetch(
		node,
		token,
		`/game-servers/files/${identifier}/download?file=${encodeURIComponent(file)}`,
	);
	const { url } = (await response.json()) as { url: string };
	return url;
}

export async function fetchGameServerFileUploadUrl(
	node: NodeAddress,
	token: string,
	identifier: string,
	directory = "/",
): Promise<string> {
	const response = await authorizedFetch(
		node,
		token,
		`/game-servers/files/${identifier}/upload?directory=${encodeURIComponent(directory)}`,
		{ method: "POST" },
	);
	const { url } = (await response.json()) as { url: string };
	return url;
}
