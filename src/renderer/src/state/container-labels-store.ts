import { create } from "zustand";

interface ContainerLabelsState {
	labelsByNode: Record<string, Record<string, string>>;
	loadedNodes: Record<string, boolean>;
	load: (nodeId: string) => Promise<void>;
	setLabel: (nodeId: string, containerId: string, label: string) => Promise<void>;
}

/**
 * Dockerコンテナのカスタム表示名(ラベル)。実際のコンテナ名は変更せず、
 * UI上の表示のみを差し替える。永続化はmainプロセスのconfig-store経由(nodes-storeと同じ方式)。
 */
export const useContainerLabelsStore = create<ContainerLabelsState>((set, get) => ({
	labelsByNode: {},
	loadedNodes: {},
	async load(nodeId) {
		if (get().loadedNodes[nodeId]) return;
		const labels = await window.api.config.listContainerLabels(nodeId);
		set((state) => ({
			labelsByNode: { ...state.labelsByNode, [nodeId]: labels },
			loadedNodes: { ...state.loadedNodes, [nodeId]: true },
		}));
	},
	async setLabel(nodeId, containerId, label) {
		await window.api.config.setContainerLabel(nodeId, containerId, label);
		set((state) => {
			const current = { ...(state.labelsByNode[nodeId] ?? {}) };
			if (label.trim() === "") {
				delete current[containerId];
			} else {
				current[containerId] = label.trim();
			}
			return { labelsByNode: { ...state.labelsByNode, [nodeId]: current } };
		});
	},
}));
