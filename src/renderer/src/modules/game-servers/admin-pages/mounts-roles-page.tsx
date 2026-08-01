import { Construction } from "lucide-react";
import { useParams } from "react-router-dom";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Card, CardContent } from "@renderer/components/ui/card";

/** マウント・ロール管理ページ。実装時は`/game-servers/admin/mounts-roles`のAPIを利用する */
export function MountsRolesPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/game-servers/admin`}
			backLabel="管理者機能一覧に戻る"
			title="マウント・ロール管理"
			description="サーバーに追加でマウントできるボリュームと、パネル管理者のロール(権限セット)を管理します。"
		>
			<Card>
				<CardContent className="flex flex-col items-center gap-3 py-16 text-center">
					<Construction className="h-8 w-8 text-muted-foreground" />
					<p className="text-sm font-medium">この機能は現在実装中です</p>
					<p className="max-w-md text-xs text-muted-foreground">
						マウントの一覧・作成・削除、ロールの閲覧は後続タスクで実装予定です。
					</p>
				</CardContent>
			</Card>
		</DashboardPageLayout>
	);
}
