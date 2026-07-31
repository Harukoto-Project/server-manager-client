import { Badge } from "@renderer/components/ui/badge";

export function UnitStateBadge({ active }: { active: string }) {
	if (active === "active") return <Badge variant="success">稼働中</Badge>;
	if (active === "failed") return <Badge variant="destructive">失敗</Badge>;
	return <Badge variant="secondary">{active || "不明"}</Badge>;
}
