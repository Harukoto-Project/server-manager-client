import { Badge } from "@renderer/components/ui/badge";

export function OperStateBadge({ operstate }: { operstate: string }) {
	if (operstate === "up") return <Badge variant="success">up</Badge>;
	if (operstate === "down") return <Badge variant="secondary">down</Badge>;
	return <Badge variant="outline">{operstate || "不明"}</Badge>;
}

export function ConnectionStateBadge({ state }: { state: string }) {
	if (state === "LISTEN") return <Badge variant="secondary">LISTEN</Badge>;
	if (state === "ESTABLISHED") return <Badge variant="success">ESTABLISHED</Badge>;
	return <Badge variant="outline">{state || "—"}</Badge>;
}
