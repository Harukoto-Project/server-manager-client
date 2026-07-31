import { useEffect } from "react";
import type { StorageIoSnapshot } from "@renderer/lib/node-api-client";
import { useStorageIoHistoryStore } from "@renderer/state/storage-io-history-store";

/** ディスクI/Oのsnapshotをノードごとに積み立て、これまでの履歴配列を返す(useMonitoringHistoryと同様のパターン) */
export function useStorageIoHistory(nodeId: string | undefined, snapshot: StorageIoSnapshot | undefined): StorageIoSnapshot[] {
	const push = useStorageIoHistoryStore((s) => s.push);
	const history = useStorageIoHistoryStore((s) => (nodeId ? s.historyByNode[nodeId] : undefined));

	useEffect(() => {
		if (nodeId && snapshot) push(nodeId, snapshot);
	}, [nodeId, snapshot, push]);

	return history ?? [];
}
