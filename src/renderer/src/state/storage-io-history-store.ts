import { create } from "zustand";
import type { StorageIoSnapshot } from "@renderer/lib/node-api-client";

/** ディスクI/Oも履歴APIがないため、モニタリング同様にクライアント側で蓄積する(約10分間分) */
const MAX_SAMPLES = 200;

interface StorageIoHistoryState {
	historyByNode: Record<string, StorageIoSnapshot[]>;
	push: (nodeId: string, snapshot: StorageIoSnapshot) => void;
}

export const useStorageIoHistoryStore = create<StorageIoHistoryState>((set, get) => ({
	historyByNode: {},
	push(nodeId, snapshot) {
		const current = get().historyByNode[nodeId] ?? [];
		if (current[current.length - 1]?.timestamp === snapshot.timestamp) return;
		const next = [...current, snapshot].slice(-MAX_SAMPLES);
		set({ historyByNode: { ...get().historyByNode, [nodeId]: next } });
	},
}));
