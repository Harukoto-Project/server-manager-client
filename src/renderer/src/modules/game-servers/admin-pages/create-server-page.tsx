import { Construction } from "lucide-react";
import { useParams } from "react-router-dom";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Card, CardContent } from "@renderer/components/ui/card";

/**
 * サーバー作成ページ。実装時は`/game-servers/admin/create-server`および
 * `/game-servers/admin/nests-eggs`(Nest/Egg選択)・`/game-servers/admin/nodes`(Node選択)・
 * `/game-servers/admin/allocations`(割り当てリソース選択)のAPIを組み合わせて使う。
 */
export function CreateServerPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/game-servers/admin`}
			backLabel="管理者機能一覧に戻る"
			title="サーバー作成"
			description="Nest/Egg/ノード/割り当てリソースを選択して新規サーバーを作成します。"
		>
			<Card>
				<CardContent className="flex flex-col items-center gap-3 py-16 text-center">
					<Construction className="h-8 w-8 text-muted-foreground" />
					<p className="text-sm font-medium">この機能は現在実装中です</p>
					<p className="max-w-md text-xs text-muted-foreground">
						新規サーバー作成フォーム(Nest/Egg選択・ノード選択・リソース割り当て)は後続タスクで実装予定です。
					</p>
				</CardContent>
			</Card>
		</DashboardPageLayout>
	);
}
