export interface NodeAddress {
	host: string;
	port: number;
	tlsEnabled?: boolean;
}

export interface MonitoringSnapshot {
	timestamp: string;
	uptimeSeconds: number;
	cpu: { manufacturer: string; brand: string; cores: number; loadPercent: number };
	memory: { totalBytes: number; usedBytes: number; freeBytes: number; usedPercent: number };
	disks: Array<{ mount: string; totalBytes: number; usedBytes: number; usedPercent: number }>;
	network: Array<{ interface: string; rxBytesPerSec: number; txBytesPerSec: number }>;
}

export interface DockerContainer {
	id: string;
	names: string[];
	image: string;
	state: string;
	status: string;
	ports: Array<{ IP?: string; PrivatePort?: number; PublicPort?: number; Type?: string }>;
}

export interface DockerImage {
	id: string;
	tags: string[] | null;
	sizeBytes: number;
}

export interface DockerVolume {
	name: string;
	driver: string;
	mountpoint: string;
}

export interface DockerNetwork {
	id: string;
	name: string;
	driver: string;
	scope: string;
}

export type DockerContainerAction = "start" | "stop" | "restart";

export interface SystemdUnit {
	unit: string;
	load: string;
	active: string;
	sub: string;
	description: string;
}

export type SystemdUnitAction = "start" | "stop" | "restart" | "enable" | "disable";

export interface GameServer {
	identifier: string;
	uuid: string;
	name: string;
	description: string | null;
	status: string | null;
	currentState: "running" | "starting" | "stopping" | "offline" | "unknown";
	limits: { memory: number; disk: number; cpu: number };
}

export type GameServerPowerSignal = "start" | "stop" | "restart" | "kill";

export interface NetworkInterfaceInfo {
	name: string;
	displayName: string;
	isDefault: boolean;
	ip4: string;
	ip4subnet: string;
	ip6: string;
	ip6subnet: string;
	mac: string;
	internal: boolean;
	virtual: boolean;
	operstate: string;
	type: string;
	duplex: string;
	mtu: number | null;
	speedMbps: number | null;
	dhcp: boolean;
}

export interface NetworkRoutesInfo {
	gateway: string;
	routes: string[];
}

export interface NetworkDnsInfo {
	nameservers: string[];
	raw: string;
}

export interface NetworkConnection {
	protocol: string;
	localAddress: string;
	localPort: string;
	peerAddress: string;
	peerPort: string;
	state: string;
	pid: number;
	process: string;
}

export interface StorageFilesystem {
	fs: string;
	type: string;
	mount: string;
	sizeBytes: number;
	usedBytes: number;
	availableBytes: number;
	usedPercent: number;
	rw: boolean | null;
}

export interface StorageDisk {
	device: string;
	type: string;
	name: string;
	vendor: string;
	sizeBytes: number;
	interfaceType: string;
	smartStatus: string;
	temperatureCelsius: number | null;
}

export interface StorageBlockDevice {
	name: string;
	identifier: string;
	type: string;
	fsType: string;
	mount: string;
	sizeBytes: number;
	physical: string;
	uuid: string;
	label: string;
	model: string;
	removable: boolean;
}

export interface StorageIoSnapshot {
	timestamp: string;
	readOpsPerSec: number | null;
	writeOpsPerSec: number | null;
	totalOpsPerSec: number | null;
	readWaitPercent: number | null;
	writeWaitPercent: number | null;
}

export interface SystemSettingsBasics {
	hostname: string;
	timezone: string;
}

export type ProcessManagerProjectKind = "node" | "python" | "custom";
export type ProcessManagerProjectStatus = "stopped" | "running" | "crashed";
export type ProcessManagerAction = "start" | "stop" | "restart";

export interface ProcessManagerProject {
	id: string;
	name: string;
	kind: ProcessManagerProjectKind;
	cwd: string;
	command: string;
	args: string[];
	env: Record<string, string>;
	autoStart: boolean;
	status: ProcessManagerProjectStatus;
}

export interface RegisterProcessManagerProjectInput {
	name: string;
	kind: ProcessManagerProjectKind;
	cwd: string;
	command: string;
	args?: string[];
	env?: Record<string, string>;
	autoStart?: boolean;
}

export function baseUrl(node: NodeAddress): string {
	const scheme = node.tlsEnabled ? "https" : "http";
	return `${scheme}://${node.host}:${node.port}`;
}

function wsBaseUrl(node: NodeAddress): string {
	const scheme = node.tlsEnabled ? "wss" : "ws";
	return `${scheme}://${node.host}:${node.port}`;
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

export async function fetchNodeHealth(node: NodeAddress): Promise<{ status: string; time: string; version?: string }> {
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

export interface AuthStatus {
	registrationEnabled: boolean;
	passkeyCount: number;
	rpId?: string;
	expectedOrigin?: string;
}

export async function fetchAuthStatus(node: NodeAddress): Promise<AuthStatus> {
	let response: Response;
	try {
		response = await fetch(`${baseUrl(node)}/auth/status`);
	} catch {
		throw new NodeApiError("ノードに接続できません。");
	}
	if (!response.ok) throw new NodeApiError(`HTTP ${response.status}`);
	return response.json();
}

export async function fetchLoginOptions(node: NodeAddress): Promise<unknown> {
	let response: Response;
	try {
		response = await fetch(`${baseUrl(node)}/auth/login/options`);
	} catch {
		throw new NodeApiError("ノードに接続できません。");
	}
	if (!response.ok) {
		const data = (await response.clone().json().catch(() => ({}))) as { error?: string };
		throw new NodeApiError(data.error ?? `HTTP ${response.status}`, response.status);
	}
	return response.json();
}

export async function verifyLogin(
	node: NodeAddress,
	authResponse: unknown,
): Promise<{ token: string; expiresInMinutes: number }> {
	let response: Response;
	try {
		response = await fetch(`${baseUrl(node)}/auth/login/verify`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ response: authResponse }),
		});
	} catch {
		throw new NodeApiError("ノードに接続できません。");
	}
	if (!response.ok) {
		const data = (await response.clone().json().catch(() => ({}))) as { error?: string };
		throw new NodeApiError(data.error ?? `HTTP ${response.status}`, response.status);
	}
	return response.json();
}

export async function fetchRegisterOptions(node: NodeAddress): Promise<unknown> {
	let response: Response;
	try {
		response = await fetch(`${baseUrl(node)}/auth/register/options`);
	} catch {
		throw new NodeApiError("ノードに接続できません。");
	}
	if (!response.ok) {
		const data = (await response.clone().json().catch(() => ({}))) as { error?: string };
		throw new NodeApiError(data.error ?? `HTTP ${response.status}`, response.status);
	}
	return response.json();
}

export async function verifyRegistration(
	node: NodeAddress,
	regResponse: unknown,
): Promise<{ verified: boolean; recoveryCode?: string }> {
	let response: Response;
	try {
		response = await fetch(`${baseUrl(node)}/auth/register/verify`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ response: regResponse }),
		});
	} catch {
		throw new NodeApiError("ノードに接続できません。");
	}
	if (!response.ok) {
		const data = (await response.clone().json().catch(() => ({}))) as { error?: string };
		throw new NodeApiError(data.error ?? `HTTP ${response.status}`, response.status);
	}
	return response.json();
}

export async function fetchRecoverOptions(node: NodeAddress, code: string): Promise<unknown> {
	let response: Response;
	try {
		response = await fetch(`${baseUrl(node)}/auth/recover`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ code }),
		});
	} catch {
		throw new NodeApiError("ノードに接続できません。");
	}
	if (!response.ok) {
		const data = (await response.clone().json().catch(() => ({}))) as { error?: string };
		throw new NodeApiError(data.error ?? `HTTP ${response.status}`, response.status);
	}
	return response.json();
}

export function decodeJwtExp(token: string): number | null {
	try {
		const payload = JSON.parse(atob(token.split(".")[1]));
		return typeof payload.exp === "number" ? payload.exp * 1000 : null;
	} catch {
		return null;
	}
}

export function isTokenExpired(token: string): boolean {
	const exp = decodeJwtExp(token);
	if (exp === null) return true;
	return exp <= Date.now();
}

export interface AuthorizedFetchOptions {
	method?: "GET" | "POST" | "PUT" | "DELETE";
	body?: unknown;
	signal?: AbortSignal;
}

export async function authorizedFetch(
	node: NodeAddress,
	token: string,
	path: string,
	options: AuthorizedFetchOptions = {},
): Promise<Response> {
	let response: Response;
	try {
		response = await fetch(`${baseUrl(node)}${path}`, {
			method: options.method ?? "GET",
			headers: {
				Authorization: `Bearer ${token}`,
				...(options.body ? { "Content-Type": "application/json" } : {}),
			},
			body: options.body ? JSON.stringify(options.body) : undefined,
			signal: options.signal,
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

export async function verifyNodeSession(node: NodeAddress, token: string): Promise<void> {
	await authorizedFetch(node, token, "/monitoring/summary");
}

export async function fetchMonitoringSummary(node: NodeAddress, token: string): Promise<MonitoringSnapshot> {
	const response = await authorizedFetch(node, token, "/monitoring/summary");
	return response.json();
}

/**
 * サーバー側(SQLite)に記録された過去のモニタリング履歴を取得する。
 * クライアントの接続有無に関わらずAPI側が一定間隔で記録し続けているため、
 * アプリを開き直しても過去の推移を確認できる。
 */
export async function fetchMonitoringHistory(
	node: NodeAddress,
	token: string,
	rangeMinutes: number,
	maxPoints = 300,
): Promise<MonitoringSnapshot[]> {
	const response = await authorizedFetch(
		node,
		token,
		`/monitoring/history?rangeMinutes=${rangeMinutes}&maxPoints=${maxPoints}`,
	);
	const { samples } = (await response.json()) as { samples: MonitoringSnapshot[] };
	return samples;
}

// --- Docker ---

export async function fetchDockerContainers(node: NodeAddress, token: string): Promise<DockerContainer[]> {
	const response = await authorizedFetch(node, token, "/docker/containers");
	return response.json();
}

export async function dockerContainerAction(
	node: NodeAddress,
	token: string,
	containerId: string,
	action: DockerContainerAction,
): Promise<void> {
	await authorizedFetch(node, token, `/docker/containers/${containerId}/action`, {
		method: "POST",
		body: { action },
	});
}

export async function fetchDockerContainerLogs(
	node: NodeAddress,
	token: string,
	containerId: string,
): Promise<string[]> {
	const response = await authorizedFetch(node, token, `/docker/containers/${containerId}/logs`);
	const { logs } = (await response.json()) as { logs: string };
	return logs.split("\n").filter((line) => line.length > 0);
}

export async function fetchDockerImages(node: NodeAddress, token: string): Promise<DockerImage[]> {
	const response = await authorizedFetch(node, token, "/docker/images");
	return response.json();
}

export async function fetchDockerVolumes(node: NodeAddress, token: string): Promise<DockerVolume[]> {
	const response = await authorizedFetch(node, token, "/docker/volumes");
	return response.json();
}

export async function fetchDockerNetworks(node: NodeAddress, token: string): Promise<DockerNetwork[]> {
	const response = await authorizedFetch(node, token, "/docker/networks");
	return response.json();
}

// --- systemd ---

export async function fetchSystemdUnits(node: NodeAddress, token: string): Promise<SystemdUnit[]> {
	const response = await authorizedFetch(node, token, "/systemd/units");
	const { units } = (await response.json()) as { units: SystemdUnit[] };
	return units;
}

export async function systemdUnitAction(
	node: NodeAddress,
	token: string,
	unit: string,
	action: SystemdUnitAction,
): Promise<void> {
	await authorizedFetch(node, token, `/systemd/units/${encodeURIComponent(unit)}/action`, {
		method: "POST",
		body: { action },
	});
}

export async function fetchSystemdUnitLogs(node: NodeAddress, token: string, unit: string): Promise<string[]> {
	const response = await authorizedFetch(node, token, `/systemd/units/${encodeURIComponent(unit)}/logs`);
	const { logs } = (await response.json()) as { logs: string };
	return logs.split("\n").filter((line) => line.length > 0);
}

export interface SystemdJournalFilter {
	unit?: string;
	priority?: string;
	since?: string;
	until?: string;
	lines?: number;
}

export async function fetchSystemdJournal(
	node: NodeAddress,
	token: string,
	filter: SystemdJournalFilter = {},
): Promise<string[]> {
	const params = new URLSearchParams();
	if (filter.unit) params.set("unit", filter.unit);
	if (filter.priority) params.set("priority", filter.priority);
	if (filter.since) params.set("since", filter.since);
	if (filter.until) params.set("until", filter.until);
	if (filter.lines !== undefined) params.set("lines", String(filter.lines));
	const qs = params.toString();
	const response = await authorizedFetch(node, token, `/systemd/journal${qs ? `?${qs}` : ""}`);
	const { logs } = (await response.json()) as { logs: string };
	return logs.split("\n").filter((line) => line.length > 0);
}

// --- ゲームサーバー(Pterodactyl連携) ---

export async function fetchGameServers(node: NodeAddress, token: string): Promise<GameServer[]> {
	const response = await authorizedFetch(node, token, "/game-servers/servers");
	const { servers } = (await response.json()) as { servers: GameServer[] };
	return servers;
}

export async function gameServerPowerAction(
	node: NodeAddress,
	token: string,
	identifier: string,
	signal: GameServerPowerSignal,
): Promise<void> {
	await authorizedFetch(node, token, `/game-servers/servers/${identifier}/power`, {
		method: "POST",
		body: { signal },
	});
}

// --- ネットワーク詳細 ---

export async function fetchNetworkInterfaces(node: NodeAddress, token: string): Promise<NetworkInterfaceInfo[]> {
	const response = await authorizedFetch(node, token, "/network/interfaces");
	const { interfaces } = (await response.json()) as { interfaces: NetworkInterfaceInfo[] };
	return interfaces;
}

export async function fetchNetworkRoutes(node: NodeAddress, token: string): Promise<NetworkRoutesInfo> {
	const response = await authorizedFetch(node, token, "/network/routes");
	return response.json();
}

export async function fetchNetworkDns(node: NodeAddress, token: string): Promise<NetworkDnsInfo> {
	const response = await authorizedFetch(node, token, "/network/dns");
	return response.json();
}

export async function fetchNetworkConnections(
	node: NodeAddress,
	token: string,
): Promise<{ connections: NetworkConnection[]; total: number }> {
	const response = await authorizedFetch(node, token, "/network/connections");
	return response.json();
}

// --- ストレージ詳細 ---

export async function fetchStorageFilesystems(node: NodeAddress, token: string): Promise<StorageFilesystem[]> {
	const response = await authorizedFetch(node, token, "/storage/filesystems");
	const { filesystems } = (await response.json()) as { filesystems: StorageFilesystem[] };
	return filesystems;
}

export async function fetchStorageDisks(node: NodeAddress, token: string): Promise<StorageDisk[]> {
	const response = await authorizedFetch(node, token, "/storage/disks");
	const { disks } = (await response.json()) as { disks: StorageDisk[] };
	return disks;
}

export async function fetchStorageBlockDevices(node: NodeAddress, token: string): Promise<StorageBlockDevice[]> {
	const response = await authorizedFetch(node, token, "/storage/block-devices");
	const { devices } = (await response.json()) as { devices: StorageBlockDevice[] };
	return devices;
}

export async function fetchStorageIo(node: NodeAddress, token: string): Promise<StorageIoSnapshot> {
	const response = await authorizedFetch(node, token, "/storage/io");
	return response.json();
}

/**
 * サーバー側(SQLite)に記録された過去のディスクI/O履歴を取得する。
 * `fetchMonitoringHistory`と同様、クライアントの接続有無に関わらずAPI側が一定間隔で記録し続けているため、
 * アプリを開き直しても過去の推移を確認できる。
 */
export async function fetchStorageIoHistory(
	node: NodeAddress,
	token: string,
	rangeMinutes: number,
	maxPoints = 300,
): Promise<StorageIoSnapshot[]> {
	const response = await authorizedFetch(
		node,
		token,
		`/storage/io/history?rangeMinutes=${rangeMinutes}&maxPoints=${maxPoints}`,
	);
	const { samples } = (await response.json()) as { samples: StorageIoSnapshot[] };
	return samples;
}

// --- プロセス管理(Node.js/Pythonプロジェクト) ---

export async function fetchProcessManagerProjects(
	node: NodeAddress,
	token: string,
): Promise<ProcessManagerProject[]> {
	const response = await authorizedFetch(node, token, "/process-manager/projects");
	const { projects } = (await response.json()) as { projects: ProcessManagerProject[] };
	return projects;
}

export async function registerProcessManagerProject(
	node: NodeAddress,
	token: string,
	input: RegisterProcessManagerProjectInput,
): Promise<{ id: string }> {
	const response = await authorizedFetch(node, token, "/process-manager/projects", {
		method: "POST",
		body: input,
	});
	return response.json();
}

export async function removeProcessManagerProject(node: NodeAddress, token: string, id: string): Promise<void> {
	await authorizedFetch(node, token, `/process-manager/projects/${id}`, { method: "DELETE" });
}

export async function processManagerProjectAction(
	node: NodeAddress,
	token: string,
	id: string,
	action: ProcessManagerAction,
): Promise<void> {
	await authorizedFetch(node, token, `/process-manager/projects/${id}/${action}`, { method: "POST" });
}

export function buildProcessManagerConsoleUrl(node: NodeAddress, token: string, id: string): string {
	return `${wsBaseUrl(node)}/process-manager/projects/${id}/console?token=${encodeURIComponent(token)}`;
}

// --- システム設定 ---

export async function fetchSystemSettingsBasics(node: NodeAddress, token: string): Promise<SystemSettingsBasics> {
	const response = await authorizedFetch(node, token, "/system-settings/basics");
	return response.json();
}

export async function fetchSystemSettingsAptUpdates(node: NodeAddress, token: string): Promise<string[]> {
	const response = await authorizedFetch(node, token, "/system-settings/apt/updates");
	const { packages } = (await response.json()) as { packages: string[] };
	return packages;
}

export async function fetchSystemSettingsUfwStatus(node: NodeAddress, token: string): Promise<string> {
	const response = await authorizedFetch(node, token, "/system-settings/ufw/status");
	const { status } = (await response.json()) as { status: string };
	return status;
}

// --- Webターミナル ---

export function buildTerminalSessionUrl(node: NodeAddress, token: string): string {
	return `${wsBaseUrl(node)}/terminal/session?token=${encodeURIComponent(token)}`;
}

// --- ファイルマネージャー ---

export interface FileEntry {
	name: string;
	type: "file" | "directory";
	size: number | null;
	modifiedAt: string | null;
	permissions: string | null;
	path: string;
}

export interface FileListResult {
	path: string;
	items: FileEntry[];
}

export interface FileReadResult {
	isBinary: boolean;
	content: string | null;
}

export async function fetchFileList(node: NodeAddress, token: string, dirPath: string): Promise<FileListResult> {
	const response = await authorizedFetch(
		node,
		token,
		`/file-manager/list?path=${encodeURIComponent(dirPath)}`,
	);
	return response.json();
}

export async function readFile(node: NodeAddress, token: string, filePath: string): Promise<FileReadResult> {
	const response = await authorizedFetch(
		node,
		token,
		`/file-manager/read?path=${encodeURIComponent(filePath)}`,
	);
	return response.json();
}

export async function writeFile(node: NodeAddress, token: string, filePath: string, content: string): Promise<void> {
	await authorizedFetch(node, token, "/file-manager/write", {
		method: "POST",
		body: { path: filePath, content },
	});
}

export async function createDirectory(node: NodeAddress, token: string, dirPath: string): Promise<void> {
	await authorizedFetch(node, token, "/file-manager/mkdir", {
		method: "POST",
		body: { path: dirPath },
	});
}

export async function deleteFileOrDirectory(node: NodeAddress, token: string, targetPath: string): Promise<void> {
	await authorizedFetch(node, token, "/file-manager/delete", {
		method: "DELETE",
		body: { path: targetPath },
	});
}

export async function renameFileOrDirectory(
	node: NodeAddress,
	token: string,
	oldPath: string,
	newPath: string,
): Promise<void> {
	await authorizedFetch(node, token, "/file-manager/rename", {
		method: "POST",
		body: { oldPath, newPath },
	});
}

// --- MinIO ---

export interface MinioBucket {
	name: string;
	creationDate: string;
}

export interface MinioBucketInfo {
	available: boolean;
	name: string;
	objectCount: number;
	totalSizeBytes: number;
}

export async function fetchMinioStatus(
	node: NodeAddress,
	token: string,
): Promise<{ available: boolean; online?: boolean }> {
	const response = await authorizedFetch(node, token, "/minio/status");
	return response.json();
}

export async function fetchMinioBuckets(
	node: NodeAddress,
	token: string,
): Promise<{ available: boolean; buckets: MinioBucket[] }> {
	const response = await authorizedFetch(node, token, "/minio/buckets");
	return response.json();
}

export async function fetchMinioBucketInfo(
	node: NodeAddress,
	token: string,
	bucketName: string,
): Promise<MinioBucketInfo> {
	const response = await authorizedFetch(node, token, `/minio/buckets/${encodeURIComponent(bucketName)}/info`);
	return response.json();
}
