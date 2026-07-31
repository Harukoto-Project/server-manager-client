import { Plus, Terminal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EntityList, EntityListItem } from "@renderer/components/common/entity-list";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Badge } from "@renderer/components/ui/badge";
import { Button } from "@renderer/components/ui/button";
import { placeholderProjects } from "./placeholder-data";

export function ProjectListPage() {
	const navigate = useNavigate();

	return (
		<DashboardPageLayout
			title="Node.js / Pythonプロジェクト"
			description="行をクリックすると、起動/停止/自動再起動とリアルタイムコンソールを持つ詳細ページに移動します。"
			actions={
				<Button size="sm">
					<Plus className="h-4 w-4" /> プロジェクトを追加
				</Button>
			}
		>
			<EntityList>
				{placeholderProjects.map((project) => (
					<EntityListItem
						key={project.id}
						icon={Terminal}
						title={project.name}
						subtitle={project.command}
						meta={project.kind}
						badge={
							<Badge variant={project.status === "running" ? "success" : "secondary"}>
								{project.status === "running" ? "稼働中" : "停止中"}
							</Badge>
						}
						onClick={() => navigate(project.id)}
					/>
				))}
			</EntityList>
		</DashboardPageLayout>
	);
}
