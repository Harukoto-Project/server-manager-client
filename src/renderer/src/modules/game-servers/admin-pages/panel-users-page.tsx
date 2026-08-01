import { Construction } from "lucide-react";
import { useParams } from "react-router-dom";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Card, CardContent } from "@renderer/components/ui/card";

/** パネルユーザー管理ページ。実装時は`/game-servers/admin/panel-users`のAPIを利用する */
export function PanelUsersPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/game-servers/admin`}
			backLabel="管理者機能一覧に戻る"
			title="パネルユーザー管理"
			description="Pterodactylパネルへのログインアカウントを管理します。「システム設定」の「ユーザー・グループ管理」(このサーバー自体のLinuxシステムユーザー)とは別物です。"
		>
			<Card>
				<CardContent className="flex flex-col items-center gap-3 py-16 text-center">
					<Construction className="h-8 w-8 text-muted-foreground" />
					<p className="text-sm font-medium">この機能は現在実装中です</p>
					<p className="max-w-md text-xs text-muted-foreground">
						パネルユーザーの一覧・作成・編集・削除は後続タスクで実装予定です。
					</p>
				</CardContent>
			</Card>
		</DashboardPageLayout>
	);
}
