import { Badge } from "@renderer/components/ui/badge";
import type { DockerContainer } from "@renderer/lib/node-api-client";

export function containerRealName(container: DockerContainer): string {
	return container.names[0]?.replace(/^\//, "") ?? container.id.slice(0, 12);
}

/** カスタムラベルが設定されていればそれを、無ければDocker上の実際のコンテナ名を返す */
export function containerDisplayName(container: DockerContainer, label?: string): string {
	return label && label.trim() !== "" ? label : containerRealName(container);
}

export function ContainerStateBadge({ state }: { state: string }) {
	if (state === "running") return <Badge variant="success">起動中</Badge>;
	if (state === "paused") return <Badge variant="secondary">一時停止</Badge>;
	return <Badge variant="secondary">停止中</Badge>;
}
