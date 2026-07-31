import { create } from "zustand";
import type { NodeAddress } from "@renderer/lib/node-api-client";
import { TerminalRuntime } from "@renderer/modules/terminal/terminal-runtime";

export interface TerminalTabMeta {
	id: string;
	label: string;
}

interface NodeTerminalState {
	credentials: { username: string; password: string } | null;
	tabs: TerminalTabMeta[];
	activeTabId: string | null;
	nextTabNumber: number;
}

function emptyNodeState(): NodeTerminalState {
	return { credentials: null, tabs: [], activeTabId: null, nextTabNumber: 1 };
}

interface TerminalStoreState {
	/** ノードIDごとのタブ一覧・認証情報。UIの再レンダリングが必要な「メタ情報」のみを持つ */
	nodeStates: Record<string, NodeTerminalState>;
	/** タブIDごとの実接続(xterm.js + WebSocket)。Reactコンポーネントのマウント状態と無関係にアプリ全体で保持する */
	runtimes: Map<string, TerminalRuntime>;

	login: (nodeId: string, node: NodeAddress, token: string, username: string, password: string) => void;
	addTab: (nodeId: string, node: NodeAddress, token: string) => void;
	closeTab: (nodeId: string, tabId: string) => void;
	logoutAll: (nodeId: string) => void;
	setActiveTab: (nodeId: string, tabId: string) => void;
}

/**
 * Webターミナルの認証状態・タブ・接続をアプリ全体(モジュールレベルのシングルトン)で保持するストア。
 * ターミナルページ(コンポーネント)が別のノードやモジュールへの遷移でアンマウントされても、
 * ここに保持されたTerminalRuntime(xterm.js + WebSocket)は破棄されないため、
 * アプリ(Electronプロセス)自体を終了しない限りログイン状態・接続が維持される。
 */
export const useTerminalStore = create<TerminalStoreState>((set, get) => ({
	nodeStates: {},
	runtimes: new Map(),

	login(nodeId, node, token, username, password) {
		const id = crypto.randomUUID();
		get().runtimes.set(id, new TerminalRuntime(node, token, username, password));
		set((state) => ({
			nodeStates: {
				...state.nodeStates,
				[nodeId]: {
					credentials: { username, password },
					tabs: [{ id, label: "ターミナル 1" }],
					activeTabId: id,
					nextTabNumber: 2,
				},
			},
		}));
	},

	addTab(nodeId, node, token) {
		const current = get().nodeStates[nodeId];
		if (!current?.credentials) return;
		const id = crypto.randomUUID();
		get().runtimes.set(id, new TerminalRuntime(node, token, current.credentials.username, current.credentials.password));
		set((state) => ({
			nodeStates: {
				...state.nodeStates,
				[nodeId]: {
					...current,
					tabs: [...current.tabs, { id, label: `ターミナル ${current.nextTabNumber}` }],
					activeTabId: id,
					nextTabNumber: current.nextTabNumber + 1,
				},
			},
		}));
	},

	closeTab(nodeId, tabId) {
		const current = get().nodeStates[nodeId];
		if (!current) return;
		const index = current.tabs.findIndex((t) => t.id === tabId);
		if (index === -1) return;

		get().runtimes.get(tabId)?.dispose();
		get().runtimes.delete(tabId);

		const nextTabs = current.tabs.filter((t) => t.id !== tabId);
		const nextActive = current.activeTabId !== tabId ? current.activeTabId : nextTabs[index]?.id ?? nextTabs[index - 1]?.id ?? null;

		set((state) => ({
			nodeStates: {
				...state.nodeStates,
				[nodeId]: nextTabs.length > 0 ? { ...current, tabs: nextTabs, activeTabId: nextActive } : emptyNodeState(),
			},
		}));
	},

	logoutAll(nodeId) {
		const current = get().nodeStates[nodeId];
		if (!current) return;
		for (const tab of current.tabs) {
			get().runtimes.get(tab.id)?.dispose();
			get().runtimes.delete(tab.id);
		}
		set((state) => ({
			nodeStates: { ...state.nodeStates, [nodeId]: emptyNodeState() },
		}));
	},

	setActiveTab(nodeId, tabId) {
		const current = get().nodeStates[nodeId];
		if (!current) return;
		set((state) => ({
			nodeStates: { ...state.nodeStates, [nodeId]: { ...current, activeTabId: tabId } },
		}));
	},
}));
