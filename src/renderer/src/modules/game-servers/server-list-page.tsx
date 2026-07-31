import { useQuery } from "@tanstack/react-query";
import { Gamepad2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { EntityList, EntityListItem } from "@renderer/components/common/entity-list";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Card, CardContent } from "@renderer/components/ui/card";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import { NodeApiError, fetchGameServers } from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";
import { ServerStateBadge } from "./shared";

export function ServerListPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const navigate = useNavigate();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);

	const ready = Boolean(node && token);

	const serversQuery = useQuery({
		queryKey: ["game-servers", nodeId],
		queryFn: () => fetchGameServers(node!, token!),
		enabled: ready,
		refetchInterval: 10000,
		retry: 1,
	});

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || serversQuery.isLoading) statusMessage = "接続中...";
	else if (serversQuery.isError)
		statusMessage =
			serversQuery.error instanceof NodeApiError
				? serversQuery.error.message
				: "Pterodactylパネルに接続できませんでした。";

	return (
		<DashboardPageLayout
			title="Minecraft / ゲームサーバー"
			description="既存Pterodactylパネルの Application/Client API 経由で管理します。行をクリックするとサーバーの詳細ページに移動します。"
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}

			{ready && !serversQuery.isLoading && serversQuery.data?.length === 0 && (
				<Card>
					<CardContent className="py-6 text-sm text-muted-foreground">
						Pterodactylパネルにサーバーが見つかりませんでした。
					</CardContent>
				</Card>
			)}

			{serversQuery.data && serversQuery.data.length > 0 && (
				<EntityList>
					{serversQuery.data.map((server) => (
						<EntityListItem
							key={server.identifier}
							icon={Gamepad2}
							title={server.name}
							subtitle={server.description || undefined}
							meta={`#${server.identifier}`}
							badge={<ServerStateBadge server={server} />}
							onClick={() => navigate(`servers/${server.identifier}`)}
						/>
					))}
				</EntityList>
			)}
		</DashboardPageLayout>
	);
}
