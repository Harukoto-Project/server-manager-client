import { useAuthStore } from "@renderer/state/auth-store";

/** ノードのJWTセッショントークンをauth-storeから取得する */
export function useNodeAccessToken(nodeId: string | undefined) {
	const getToken = useAuthStore((s) => s.getToken);
	const token = nodeId ? getToken(nodeId) : null;
	return { data: token, isLoading: false };
}
