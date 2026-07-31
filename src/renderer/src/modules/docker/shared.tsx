import { Badge } from "@renderer/components/ui/badge";
import type { DockerContainer } from "@renderer/lib/node-api-client";

export function containerDisplayName(container: DockerContainer): string {
	return container.names[0]?.replace(/^\//, "") ?? container.id.slice(0, 12);
}

export function ContainerStateBadge({ state }: { state: string }) {
	if (state === "running") return <Badge variant="success">起動中</Badge>;
	if (state === "paused") return <Badge variant="secondary">一時停止</Badge>;
	return <Badge variant="secondary">停止中</Badge>;
}
