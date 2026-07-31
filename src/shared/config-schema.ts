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
}
