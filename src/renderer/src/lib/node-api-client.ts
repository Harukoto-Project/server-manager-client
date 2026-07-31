export interface NodeAddress {
	host: string;
	port: number;
}

export interface MonitoringSnapshot {
	timestamp: string;
	uptimeSeconds: number;
	cpu: { manufacturer: string; brand: string; cores: number; loadPercent: number };
	memory: { totalBytes: number; usedBytes: number; freeBytes: number; usedPercent: number };
	disks: Array<{ mount: string; totalBytes: number; usedBytes: number; usedPercent: number }>;
	network: Array<{ interface: string; rxBytesPerSec: number; txBytesPerSec: number }>;
}

function baseUrl(node: NodeAddress): string {
	return `http://${node.host}:${node.port}`;
}

/**
 * ノードのAPIサーバー(server-manager-api)へのfetchクライアント。
 * V1では共有アクセストークンをAuthorization: Bearerで送る暫定認証を使う(server.ts参照)。
 */
export class NodeApiError extends Error {
	constructor(
		message: string,
		public readonly status?: number,
	) {
		super(message);
		this.name = "NodeApiError";
	}
}

export async function fetchNodeHealth(node: NodeAddress): Promise<{ status: string; time: string }> {
	let response: Response;
	try {
		response = await fetch(`${baseUrl(node)}/health`);
	} catch {
		throw new NodeApiError("ノードに接続できません。ホスト/ポートやネットワーク(WireGuard等)を確認してください。");
	}
	if (!response.ok) {
		throw new NodeApiError(`ノードからエラー応答がありました(HTTP ${response.status})`, response.status);
	}
	return response.json();
}

async function authorizedFetch(node: NodeAddress, token: string, path: string): Promise<Response> {
	let response: Response;
	try {
		response = await fetch(`${baseUrl(node)}${path}`, {
			headers: { Authorization: `Bearer ${token}` },
		});
	} catch {
		throw new NodeApiError("ノードに接続できません。ホスト/ポートやネットワーク(WireGuard等)を確認してください。");
	}
	if (response.status === 401) {
		throw new NodeApiError("アクセストークンが正しくありません。", 401);
	}
	if (!response.ok) {
		throw new NodeApiError(`ノードからエラー応答がありました(HTTP ${response.status})`, response.status);
	}
	return response;
}

export async function verifyNodeAccessToken(node: NodeAddress, token: string): Promise<void> {
	await authorizedFetch(node, token, "/monitoring/summary");
}

export async function fetchMonitoringSummary(node: NodeAddress, token: string): Promise<MonitoringSnapshot> {
	const response = await authorizedFetch(node, token, "/monitoring/summary");
	return response.json();
}
