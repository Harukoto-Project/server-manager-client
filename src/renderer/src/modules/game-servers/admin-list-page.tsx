import { useNavigate, useParams } from "react-router-dom";
import { EntityList, EntityListItem } from "@renderer/components/common/entity-list";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { gameServersAdminCategories } from "./admin-categories";

/**
 * ゲームサーバー管理者機能ハブのトップページ。
 * Application API相当(パネル全体の管理機能)のカテゴリ一覧を表示する。
 * サーバー個別の操作(Client API相当)はサーバー詳細ページのタブを参照。
 */
export function AdminListPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const navigate = useNavigate();

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/game-servers`}
			backLabel="サーバー一覧に戻る"
			title="ゲームサーバー管理者機能"
			description="Pterodactylパネル全体に関わる管理機能をまとめて操作します。特定のサーバーに対する操作は、そのサーバーの詳細ページから行ってください。"
		>
			<EntityList>
				{gameServersAdminCategories.map((category) => (
					<EntityListItem
						key={category.id}
						icon={category.icon}
						title={category.label}
						subtitle={category.description}
						onClick={() => navigate(`admin/${category.id}`)}
					/>
				))}
			</EntityList>
		</DashboardPageLayout>
	);
}
