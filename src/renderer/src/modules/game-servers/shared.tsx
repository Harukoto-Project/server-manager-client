import { Badge } from "@renderer/components/ui/badge";
import type { GameServer } from "@renderer/lib/node-api-client";

export function ServerStateBadge({ server }: { server: GameServer }) {
	if (server.status && server.status !== "installing") {
		// installing以外のApplication API状態(suspended等)は電源状態より優先して表示する
		return <Badge variant="secondary">{server.status}</Badge>;
	}
	switch (server.currentState) {
		case "running":
			return <Badge variant="success">稼働中</Badge>;
		case "starting":
			return <Badge variant="secondary">起動中...</Badge>;
		case "stopping":
			return <Badge variant="secondary">停止処理中...</Badge>;
		case "offline":
			return <Badge variant="secondary">停止中</Badge>;
		default:
			return <Badge variant="outline">状態不明</Badge>;
	}
}
