import { type IpcMain, app } from "electron";
import { randomUUID } from "node:crypto";
import type { AppConfigSchema, NodeEntry } from "../shared/config-schema.js";
import type { ConfigStore } from "./config-store.js";
import type { SecureTokenStore } from "./secure-store.js";

export function registerIpcHandlers(ipcMain: IpcMain, config: ConfigStore, secureStore: SecureTokenStore): void {
	ipcMain.handle("app:get-version", () => app.getVersion());

	ipcMain.handle("config:get", () => config.store);

	ipcMain.handle("config:set-preferences", (_event, patch: Partial<AppConfigSchema["preferences"]>) => {
		config.set("preferences", { ...config.get("preferences"), ...patch });
		return config.get("preferences");
	});

	ipcMain.handle("config:set-last-selected-node", (_event, nodeId: string | null) => {
		config.set("lastSelectedNodeId", nodeId);
	});

	ipcMain.handle("config:list-nodes", () => config.get("nodes"));

	ipcMain.handle("config:add-node", (_event, node: Omit<NodeEntry, "id" | "createdAt">) => {
		const entry: NodeEntry = {
			...node,
			id: randomUUID(),
			createdAt: new Date().toISOString(),
		};
		config.set("nodes", [...config.get("nodes"), entry]);
		return entry;
	});

	ipcMain.handle(
		"config:update-node",
		(_event, nodeId: string, patch: Partial<Omit<NodeEntry, "id" | "createdAt">>) => {
			const nodes = config.get("nodes");
			const index = nodes.findIndex((n) => n.id === nodeId);
			if (index === -1) return undefined;
			const updated: NodeEntry = { ...nodes[index], ...patch };
			const nextNodes = [...nodes];
			nextNodes[index] = updated;
			config.set("nodes", nextNodes);
			return updated;
		},
	);

	ipcMain.handle("config:remove-node", (_event, nodeId: string) => {
		config.set(
			"nodes",
			config.get("nodes").filter((n) => n.id !== nodeId),
		);
		secureStore.delete(nodeId);
		const prefix = `${nodeId}:`;
		const remainingLabels = Object.fromEntries(
			Object.entries(config.get("containerLabels")).filter(([key]) => !key.startsWith(prefix)),
		);
		config.set("containerLabels", remainingLabels);
	});

	ipcMain.handle("config:reorder-nodes", (_event, orderedIds: string[]) => {
		const byId = new Map(config.get("nodes").map((n) => [n.id, n] as const));
		const reordered = orderedIds.map((id) => byId.get(id)).filter((n): n is NodeEntry => Boolean(n));
		config.set("nodes", reordered);
	});

	ipcMain.handle("config:list-container-labels", (_event, nodeId: string) => {
		const prefix = `${nodeId}:`;
		const all = config.get("containerLabels");
		const result: Record<string, string> = {};
		for (const [key, label] of Object.entries(all)) {
			if (key.startsWith(prefix)) result[key.slice(prefix.length)] = label;
		}
		return result;
	});

	ipcMain.handle("config:set-container-label", (_event, nodeId: string, containerId: string, label: string) => {
		const key = `${nodeId}:${containerId}`;
		const all = { ...config.get("containerLabels") };
		if (label.trim() === "") {
			delete all[key];
		} else {
			all[key] = label.trim();
		}
		config.set("containerLabels", all);
	});

	ipcMain.handle("secure:set-token", (_event, nodeId: string, token: string) => {
		secureStore.set(nodeId, token);
	});

	ipcMain.handle("secure:get-token", (_event, nodeId: string) => secureStore.get(nodeId));

	ipcMain.handle("secure:delete-token", (_event, nodeId: string) => secureStore.delete(nodeId));
}
