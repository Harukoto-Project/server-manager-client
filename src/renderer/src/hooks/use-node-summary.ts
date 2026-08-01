import { useQuery } from "@tanstack/react-query";
import { fetchMonitoringSummary } from "@renderer/lib/node-api-client";
import { useAuthStore } from "@renderer/state/auth-store";
import type { NodeEntry } from "../../../shared/config-schema";

export function useNodeSummary(node: NodeEntry) {
	const getToken = useAuthStore((s) => s.getToken);
	const token = getToken(node.id);

	return useQuery({
		queryKey: ["node-summary", node.id],
		queryFn: () => fetchMonitoringSummary(node, token!),
		enabled: Boolean(token),
		refetchInterval: 30000,
		staleTime: 25000,
		retry: 0,
	});
}
