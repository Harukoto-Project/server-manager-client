import { useQuery } from "@tanstack/react-query";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import { NodeApiError, fetchStorageIoHistory } from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";

/**
 * API側(SQLite)に記録された過去のディスクI/O履歴を、指定した期間分取得する。
 * `useMonitoringHistoryQuery`と同様、アプリを開き直してもサーバーが記録し続けた過去のサンプルをそのまま閲覧できる。
 */
export function useStorageIoHistoryQuery(nodeId: string | undefined, rangeMinutes: number) {
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);

	const query = useQuery({
		queryKey: ["storage-io-history", nodeId, rangeMinutes],
		queryFn: () => fetchStorageIoHistory(node!, token!, rangeMinutes),
		enabled: Boolean(node && token),
		refetchInterval: 30000,
		retry: 1,
	});

	let statusMessage: string | undefined;
	if (tokenLoading || query.isLoading) statusMessage = "履歴を読み込み中...";
	else if (query.isError)
		statusMessage = query.error instanceof NodeApiError ? query.error.message : "履歴の取得に失敗しました。";

	return { history: query.data ?? [], isLoading: query.isLoading, statusMessage };
}
