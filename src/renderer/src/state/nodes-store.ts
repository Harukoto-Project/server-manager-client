import { create } from "zustand";
import type { NodeEntry } from "../../../shared/config-schema";

interface NodesState {
	nodes: NodeEntry[];
	loaded: boolean;
	load: () => Promise<void>;
	addNode: (node: Omit<NodeEntry, "id" | "createdAt">) => Promise<NodeEntry>;
	updateNode: (nodeId: string, patch: Partial<Omit<NodeEntry, "id" | "createdAt">>) => Promise<NodeEntry | undefined>;
	removeNode: (nodeId: string) => Promise<void>;
	reorder: (orderedIds: string[]) => Promise<void>;
}

export const useNodesStore = create<NodesState>((set, get) => ({
	nodes: [],
	loaded: false,
	async load() {
		const nodes = await window.api.config.listNodes();
		set({ nodes, loaded: true });
	},
	async addNode(node) {
		const created = await window.api.config.addNode(node);
		set({ nodes: [...get().nodes, created] });
		return created;
	},
	async updateNode(nodeId, patch) {
		const updated = await window.api.config.updateNode(nodeId, patch);
		if (updated) {
			set({ nodes: get().nodes.map((n) => (n.id === nodeId ? updated : n)) });
		}
		return updated;
	},
	async removeNode(nodeId) {
		await window.api.config.removeNode(nodeId);
		await window.api.secure.deleteToken(nodeId);
		set({ nodes: get().nodes.filter((n) => n.id !== nodeId) });
	},
	async reorder(orderedIds) {
		const byId = new Map(get().nodes.map((n) => [n.id, n] as const));
		const reordered = orderedIds.map((id) => byId.get(id)).filter((n): n is NodeEntry => Boolean(n));
		set({ nodes: reordered });
		await window.api.config.reorderNodes(orderedIds);
	},
}));
