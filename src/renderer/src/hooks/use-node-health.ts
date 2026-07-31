import { useQuery } from "@tanstack/react-query";
import { fetchNodeHealth, type NodeAddress } from "@renderer/lib/node-api-client";

/** ノードのヘルスチェックを定期的にポーリングする(接続状態バッジ表示用) */
export function useNodeHealth(node: NodeAddress) {
	return useQuery({
		queryKey: ["node-health", node.host, node.port],
		queryFn: () => fetchNodeHealth(node),
		retry: 0,
		refetchInterval: 15000,
		staleTime: 5000,
	});
}
