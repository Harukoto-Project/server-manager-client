import { create } from "zustand";
import type { MonitoringSnapshot } from "@renderer/lib/node-api-client";

/** 3秒間隔のポーリングを想定し、約10分間(200サンプル)分の履歴をメモリ上に保持する */
const MAX_SAMPLES = 200;

interface MonitoringHistoryState {
	historyByNode: Record<string, MonitoringSnapshot[]>;
	push: (nodeId: string, snapshot: MonitoringSnapshot) => void;
}

/**
 * server-manager-api はモニタリングの履歴APIを持たない(summaryは常に最新1件のみ)ため、
 * クライアント側でポーリング結果を蓄積してグラフ描画に使う簡易的な時系列ストア。
 * アプリを再起動するとリセットされる(永続化はしない)。
 */
export const useMonitoringHistoryStore = create<MonitoringHistoryState>((set, get) => ({
	historyByNode: {},
	push(nodeId, snapshot) {
		const current = get().historyByNode[nodeId] ?? [];
		if (current[current.length - 1]?.timestamp === snapshot.timestamp) return;
		const next = [...current, snapshot].slice(-MAX_SAMPLES);
		set({ historyByNode: { ...get().historyByNode, [nodeId]: next } });
	},
}));
