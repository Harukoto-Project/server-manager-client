import { Badge } from "@renderer/components/ui/badge";

export function SmartStatusBadge({ status }: { status: string }) {
	if (status === "Ok") return <Badge variant="success">正常</Badge>;
	if (!status || status === "Unknown") return <Badge variant="outline">不明</Badge>;
	return <Badge variant="destructive">{status}</Badge>;
}

export function RwBadge({ rw }: { rw: boolean | null }) {
	if (rw === null) return <Badge variant="outline">不明</Badge>;
	return rw ? <Badge variant="success">読み書き可能</Badge> : <Badge variant="secondary">読み取り専用</Badge>;
}
