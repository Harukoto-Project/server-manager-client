import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import { NodeApiError, fetchMonitoringSummary } from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";

/**
 * ノードの現在のモニタリングsnapshot(3秒間隔ポーリング)を扱う共有フック。
 * 過去の推移(履歴)はAPI側のSQLiteに記録されているため、
 * `hooks/use-monitoring-history-query.ts`の`useMonitoringHistoryQuery`を別途利用する。
 */
export function useNodeMonitoring() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);

	const query = useQuery({
		queryKey: ["monitoring-summary", nodeId],
		queryFn: () => fetchMonitoringSummary(node!, token!),
		enabled: Boolean(node && token),
		refetchInterval: 3000,
		retry: 1,
	});

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || query.isLoading) statusMessage = "接続中...";
	else if (query.isError)
		statusMessage =
			query.error instanceof NodeApiError
				? query.error.message
				: "ノードに接続できませんでした。ホスト/ポート/アクセストークンを確認してください。";

	return { nodeId, node, snapshot: query.data, statusMessage };
}
