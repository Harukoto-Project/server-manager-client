import { useEffect } from "react";
import type { MonitoringSnapshot } from "@renderer/lib/node-api-client";
import { useMonitoringHistoryStore } from "@renderer/state/monitoring-history-store";

/**
 * useQueryで取得したモニタリングsnapshotをノードごとの時系列ストアに積み立てつつ、
 * これまでに蓄積された履歴配列を返す。グラフ表示ページ間を移動しても
 * (同じノードである限り)履歴が引き継がれる。
 */
export function useMonitoringHistory(
	nodeId: string | undefined,
	snapshot: MonitoringSnapshot | undefined,
): MonitoringSnapshot[] {
	const push = useMonitoringHistoryStore((s) => s.push);
	const history = useMonitoringHistoryStore((s) => (nodeId ? s.historyByNode[nodeId] : undefined));

	useEffect(() => {
		if (nodeId && snapshot) push(nodeId, snapshot);
	}, [nodeId, snapshot, push]);

	return history ?? [];
}
