import { Construction } from "lucide-react";
import { useParams } from "react-router-dom";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Card, CardContent } from "@renderer/components/ui/card";

/** Egg・Nestライブラリ管理ページ。実装時は`/game-servers/admin/nests-eggs`のAPIを利用する */
export function EggNestPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/game-servers/admin`}
			backLabel="管理者機能一覧に戻る"
			title="Egg・Nestライブラリ管理"
			description="サーバーの雛形(Egg)と分類(Nest)の閲覧・変数管理・インポート/エクスポート/削除を行います。"
		>
			<Card>
				<CardContent className="flex flex-col items-center gap-3 py-16 text-center">
					<Construction className="h-8 w-8 text-muted-foreground" />
					<p className="text-sm font-medium">この機能は現在実装中です</p>
					<p className="max-w-md text-xs text-muted-foreground">
						Nest/Egg一覧の閲覧、変数編集、インポート/エクスポート/削除は後続タスクで実装予定です。
					</p>
				</CardContent>
			</Card>
		</DashboardPageLayout>
	);
}
