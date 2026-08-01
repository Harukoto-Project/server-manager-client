/**
 * main/preload/renderer の全プロセスから参照される共有型定義。
 * main専用の実装(config-store.tsなど)への直接依存を避けるため、
 * 型だけをこのファイルに切り出している。
 */
export type ThemePreference = "light" | "dark" | "system";

export interface NodeEntry {
	id: string;
	name: string;
	host: string;
	port: number;
	createdAt: string;
	/** server-manager-apiのインストールパス(例: /opt/server-manager-api)。APIの自動更新に使用する */
	apiInstallPath?: string;
	/** true のとき HTTPS/WSS で接続する。false または未設定の場合は HTTP/WS を使用する */
	tlsEnabled?: boolean;
	/**
	 * 初回接続時にユーザーが確認した証明書フィンガープリント(SHA-256、コロン区切り16進数)。
	 * 例: "AA:BB:CC:..."
	 * 2回目以降の接続時に照合し、不一致の場合は接続を拒否する。
	 */
	certFingerprint?: string;
}

export interface AppConfigSchema {
	preferences: {
		theme: ThemePreference;
		locale: string;
		sidebarCollapsed: boolean;
		reducedMotionOverride: boolean | null;
	};
	window: {
		width: number;
		height: number;
	};
	lastSelectedNodeId: string | null;
	nodes: NodeEntry[];
	/** Dockerコンテナのカスタム表示名(ラベル)。キーは `${nodeId}:${containerId}` */
	containerLabels: Record<string, string>;
}
