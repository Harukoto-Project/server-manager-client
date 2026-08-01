import { electronAPI } from "@electron-toolkit/preload";
import { contextBridge, ipcRenderer } from "electron";
import type { IpcRendererEvent } from "electron";
import type { AppConfigSchema, NodeEntry } from "../shared/config-schema.js";
import type { UpdaterEvent } from "../shared/updater-events.js";

/**
 * contextIsolation: true / nodeIntegration: false を前提としたブリッジAPI。
 * レンダラーからは `window.api.*` 経由でのみメインプロセス機能にアクセスできる。
 */
const api = {
	app: {
		getVersion: (): Promise<string> => ipcRenderer.invoke("app:get-version"),
	},
	config: {
		get: (): Promise<AppConfigSchema> => ipcRenderer.invoke("config:get"),
		setPreferences: (
			patch: Partial<AppConfigSchema["preferences"]>,
		): Promise<AppConfigSchema["preferences"]> => ipcRenderer.invoke("config:set-preferences", patch),
		setLastSelectedNode: (nodeId: string | null): Promise<void> =>
			ipcRenderer.invoke("config:set-last-selected-node", nodeId),
		listNodes: (): Promise<NodeEntry[]> => ipcRenderer.invoke("config:list-nodes"),
		addNode: (node: Omit<NodeEntry, "id" | "createdAt">): Promise<NodeEntry> =>
			ipcRenderer.invoke("config:add-node", node),
		removeNode: (nodeId: string): Promise<void> => ipcRenderer.invoke("config:remove-node", nodeId),
		reorderNodes: (orderedIds: string[]): Promise<void> =>
			ipcRenderer.invoke("config:reorder-nodes", orderedIds),
		listContainerLabels: (nodeId: string): Promise<Record<string, string>> =>
			ipcRenderer.invoke("config:list-container-labels", nodeId),
		setContainerLabel: (nodeId: string, containerId: string, label: string): Promise<void> =>
			ipcRenderer.invoke("config:set-container-label", nodeId, containerId, label),
		updateNode: (nodeId: string, patch: Partial<Omit<NodeEntry, "id" | "createdAt">>): Promise<NodeEntry> =>
			ipcRenderer.invoke("config:update-node", nodeId, patch),
	},
	secure: {
		setToken: (nodeId: string, token: string): Promise<void> =>
			ipcRenderer.invoke("secure:set-token", nodeId, token),
		getToken: (nodeId: string): Promise<string | null> => ipcRenderer.invoke("secure:get-token", nodeId),
		deleteToken: (nodeId: string): Promise<void> => ipcRenderer.invoke("secure:delete-token", nodeId),
	},
	updater: {
		checkForUpdates: (): Promise<void> => ipcRenderer.invoke("updater:check-for-updates"),
		quitAndInstall: (): Promise<void> => ipcRenderer.invoke("updater:quit-and-install"),
		onEvent: (callback: (event: UpdaterEvent) => void): (() => void) => {
			const listener = (_event: IpcRendererEvent, data: UpdaterEvent) => callback(data);
			ipcRenderer.on("updater:event", listener);
			return () => ipcRenderer.removeListener("updater:event", listener);
		},
	},
	tls: {
		getFingerprint: (host: string, port: number): Promise<string> =>
			ipcRenderer.invoke("tls:get-fingerprint", host, port),
	},
};

export type Api = typeof api;

if (process.contextIsolated) {
	contextBridge.exposeInMainWorld("electron", electronAPI);
	contextBridge.exposeInMainWorld("api", api);
} else {
	// contextIsolationが無効な場合のフォールバック(開発時のデバッグ用)
	(window as unknown as { electron: typeof electronAPI }).electron = electronAPI;
	(window as unknown as { api: typeof api }).api = api;
}
