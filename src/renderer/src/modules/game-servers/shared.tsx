import { Construction } from "lucide-react";
import { Badge } from "@renderer/components/ui/badge";
import { Card, CardContent } from "@renderer/components/ui/card";
import type { GameServer } from "@renderer/lib/node-api-client";

/**
 * サーバー詳細ページの各タブ(概要以外)で共通利用する「実装予定」プレースホルダー。
 * 後続タスクが実際のUIに置き換えるまでの間、各タブファイルからそのまま利用する。
 */
export function TabPlaceholder({ title, description }: { title: string; description: string }) {
	return (
		<Card>
			<CardContent className="flex flex-col items-center gap-3 py-16 text-center">
				<Construction className="h-8 w-8 text-muted-foreground" />
				<p className="text-sm font-medium">{title}</p>
				<p className="max-w-md text-xs text-muted-foreground">{description}</p>
			</CardContent>
		</Card>
	);
}

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
