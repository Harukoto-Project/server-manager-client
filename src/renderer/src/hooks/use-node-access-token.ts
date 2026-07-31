import { useQuery } from "@tanstack/react-query";

/** ノードのアクセストークンをOSのセキュアストレージ(Electron safeStorage)経由で取得する */
export function useNodeAccessToken(nodeId: string | undefined) {
	return useQuery({
		queryKey: ["node-token", nodeId],
		queryFn: () => window.api.secure.getToken(nodeId as string),
		enabled: Boolean(nodeId),
		staleTime: Number.POSITIVE_INFINITY,
	});
}
