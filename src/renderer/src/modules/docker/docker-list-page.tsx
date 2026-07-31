import { useQuery } from "@tanstack/react-query";
import { Container, HardDrive, Network } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { EntityList, EntityListItem } from "@renderer/components/common/entity-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@renderer/components/ui/tabs";
import { useContainerLabels } from "@renderer/hooks/use-container-labels";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import {
	NodeApiError,
	fetchDockerContainers,
	fetchDockerImages,
	fetchDockerNetworks,
	fetchDockerVolumes,
} from "@renderer/lib/node-api-client";
import { formatBytes } from "@renderer/lib/utils";
import { useNodesStore } from "@renderer/state/nodes-store";
import { ContainerStateBadge, containerDisplayName, containerRealName } from "./shared";

export function DockerListPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const navigate = useNavigate();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);

	const [activeTab, setActiveTab] = useState("containers");
	const ready = Boolean(node && token);
	const { labels } = useContainerLabels(nodeId);

	const containersQuery = useQuery({
		queryKey: ["docker-containers", nodeId],
		queryFn: () => fetchDockerContainers(node!, token!),
		enabled: ready,
		refetchInterval: 5000,
		retry: 1,
	});

	const imagesQuery = useQuery({
		queryKey: ["docker-images", nodeId],
		queryFn: () => fetchDockerImages(node!, token!),
		enabled: ready && activeTab === "images",
		retry: 1,
	});

	const volumesQuery = useQuery({
		queryKey: ["docker-volumes", nodeId],
		queryFn: () => fetchDockerVolumes(node!, token!),
		enabled: ready && activeTab === "volumes",
		retry: 1,
	});

	const networksQuery = useQuery({
		queryKey: ["docker-networks", nodeId],
		queryFn: () => fetchDockerNetworks(node!, token!),
		enabled: ready && activeTab === "networks",
		retry: 1,
	});

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || containersQuery.isLoading) statusMessage = "接続中...";
	else if (containersQuery.isError)
		statusMessage =
			containersQuery.error instanceof NodeApiError
				? containersQuery.error.message
				: "ノードに接続できませんでした。";

	return (
		<DashboardPageLayout
			title="Docker"
			description="コンテナ・イメージ・ボリューム・ネットワークをタブで管理します。行をクリックするとコンテナの詳細ページに移動します。"
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}

			<Tabs value={activeTab} onValueChange={setActiveTab}>
				<TabsList>
					<TabsTrigger value="containers">コンテナ</TabsTrigger>
					<TabsTrigger value="images">イメージ</TabsTrigger>
					<TabsTrigger value="volumes">ボリューム</TabsTrigger>
					<TabsTrigger value="networks">ネットワーク</TabsTrigger>
				</TabsList>

				<TabsContent value="containers">
					{ready && !containersQuery.isLoading && containersQuery.data?.length === 0 && (
						<p className="text-sm text-muted-foreground">コンテナが見つかりませんでした。</p>
					)}
					{containersQuery.data && containersQuery.data.length > 0 && (
						<EntityList>
							{containersQuery.data.map((container) => {
								const label = labels[container.id];
								return (
									<EntityListItem
										key={container.id}
										icon={Container}
										title={containerDisplayName(container, label)}
										subtitle={label ? `${containerRealName(container)} ・ ${container.image}` : container.image}
										meta={container.status}
										badge={<ContainerStateBadge state={container.state} />}
										onClick={() => navigate(`containers/${container.id}`)}
									/>
								);
							})}
						</EntityList>
					)}
				</TabsContent>

				<TabsContent value="images">
					{imagesQuery.isLoading && <p className="text-sm text-muted-foreground">読み込み中...</p>}
					{imagesQuery.data?.length === 0 && (
						<p className="text-sm text-muted-foreground">イメージが見つかりませんでした。</p>
					)}
					{imagesQuery.data && imagesQuery.data.length > 0 && (
						<EntityList>
							{imagesQuery.data.map((image) => (
								<EntityListItem
									key={image.id}
									icon={Container}
									title={image.tags?.[0] ?? image.id.replace("sha256:", "").slice(0, 12)}
									meta={formatBytes(image.sizeBytes)}
								/>
							))}
						</EntityList>
					)}
				</TabsContent>

				<TabsContent value="volumes">
					{volumesQuery.isLoading && <p className="text-sm text-muted-foreground">読み込み中...</p>}
					{volumesQuery.data?.length === 0 && (
						<p className="text-sm text-muted-foreground">ボリュームが見つかりませんでした。</p>
					)}
					{volumesQuery.data && volumesQuery.data.length > 0 && (
						<EntityList>
							{volumesQuery.data.map((volume) => (
								<EntityListItem
									key={volume.name}
									icon={HardDrive}
									title={volume.name}
									subtitle={volume.mountpoint}
									meta={volume.driver}
								/>
							))}
						</EntityList>
					)}
				</TabsContent>

				<TabsContent value="networks">
					{networksQuery.isLoading && <p className="text-sm text-muted-foreground">読み込み中...</p>}
					{networksQuery.data?.length === 0 && (
						<p className="text-sm text-muted-foreground">ネットワークが見つかりませんでした。</p>
					)}
					{networksQuery.data && networksQuery.data.length > 0 && (
						<EntityList>
							{networksQuery.data.map((net) => (
								<EntityListItem
									key={net.id}
									icon={Network}
									title={net.name}
									meta={`${net.driver} / ${net.scope}`}
								/>
							))}
						</EntityList>
					)}
				</TabsContent>
			</Tabs>
		</DashboardPageLayout>
	);
}
