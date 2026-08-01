import { Construction } from "lucide-react";
import { useParams } from "react-router-dom";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Card, CardContent } from "@renderer/components/ui/card";

/** アロケーション管理ページ。実装時は`/game-servers/admin/allocations`のAPIを利用する */
export function AllocationsPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/game-servers/admin`}
			backLabel="管理者機能一覧に戻る"
			title="アロケーション管理"
			description="各ノードに割り当てるIPアドレス/ポートの一覧・追加・削除を行います。"
		>
			<Card>
				<CardContent className="flex flex-col items-center gap-3 py-16 text-center">
					<Construction className="h-8 w-8 text-muted-foreground" />
					<p className="text-sm font-medium">この機能は現在実装中です</p>
					<p className="max-w-md text-xs text-muted-foreground">
						ノードごとのIP/ポート割り当ての閲覧・追加・削除は後続タスクで実装予定です。
					</p>
				</CardContent>
			</Card>
		</DashboardPageLayout>
	);
}
