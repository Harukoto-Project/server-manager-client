import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Terminal } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { EntityList, EntityListItem } from "@renderer/components/common/entity-list";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Button } from "@renderer/components/ui/button";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import {
	NodeApiError,
	type RegisterProcessManagerProjectInput,
	fetchProcessManagerProjects,
	registerProcessManagerProject,
} from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";
import { RegisterProjectDialog } from "./register-project-dialog";
import { ProjectStatusBadge } from "./shared";

export function ProjectListPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const navigate = useNavigate();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();
	const [registerError, setRegisterError] = useState<string | null>(null);

	const ready = Boolean(node && token);

	const projectsQuery = useQuery({
		queryKey: ["process-manager-projects", nodeId],
		queryFn: () => fetchProcessManagerProjects(node!, token!),
		enabled: ready,
		refetchInterval: 5000,
		retry: 1,
	});

	async function handleRegister(input: RegisterProcessManagerProjectInput) {
		if (!node || !token) return;
		setRegisterError(null);
		try {
			await registerProcessManagerProject(node, token, input);
			await queryClient.invalidateQueries({ queryKey: ["process-manager-projects", nodeId] });
		} catch (error) {
			const message = error instanceof NodeApiError ? error.message : "プロジェクトの登録に失敗しました。";
			setRegisterError(message);
			throw new Error(message);
		}
	}

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || projectsQuery.isLoading) statusMessage = "接続中...";
	else if (projectsQuery.isError)
		statusMessage =
			projectsQuery.error instanceof NodeApiError ? projectsQuery.error.message : "ノードに接続できませんでした。";
	else if (ready && projectsQuery.data?.length === 0) statusMessage = "登録済みのプロジェクトはありません。";

	return (
		<DashboardPageLayout
			title="Node.js / Pythonプロジェクト"
			description="行をクリックすると、起動/停止/自動再起動とリアルタイムコンソールを持つ詳細ページに移動します。"
			actions={
				<RegisterProjectDialog
					trigger={
						<Button size="sm" disabled={!ready}>
							<Plus className="h-4 w-4" /> プロジェクトを追加
						</Button>
					}
					onRegister={handleRegister}
				/>
			}
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}
			{registerError && <p className="mb-4 text-sm text-destructive">{registerError}</p>}

			{projectsQuery.data && projectsQuery.data.length > 0 && (
				<EntityList>
					{projectsQuery.data.map((project) => (
						<EntityListItem
							key={project.id}
							icon={Terminal}
							title={project.name}
							subtitle={project.command}
							meta={project.kind}
							badge={<ProjectStatusBadge status={project.status} />}
							onClick={() => navigate(project.id)}
						/>
					))}
				</EntityList>
			)}
		</DashboardPageLayout>
	);
}
