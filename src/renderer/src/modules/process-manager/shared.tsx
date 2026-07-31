import { Badge } from "@renderer/components/ui/badge";
import type { ProcessManagerProjectStatus } from "@renderer/lib/node-api-client";

export function ProjectStatusBadge({ status }: { status: ProcessManagerProjectStatus }) {
	if (status === "running") return <Badge variant="success">稼働中</Badge>;
	if (status === "crashed") return <Badge variant="destructive">クラッシュ</Badge>;
	return <Badge variant="secondary">停止中</Badge>;
}
