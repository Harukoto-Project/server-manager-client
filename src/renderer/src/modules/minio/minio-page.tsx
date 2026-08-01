import { useQuery } from "@tanstack/react-query";
import { Database, HardDrive, Package } from "lucide-react";
import { useParams } from "react-router-dom";
import { EntityList, EntityListItem } from "@renderer/components/common/entity-list";
import { Badge } from "@renderer/components/ui/badge";
import { Card, CardContent } from "@renderer/components/ui/card";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import { fetchMinioBuckets, fetchMinioStatus } from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";

export function MinioPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token } = useNodeAccessToken(nodeId);

	const ready = Boolean(node && token);

	const statusQuery = useQuery({
		queryKey: ["minio-status", nodeId],
		queryFn: () => fetchMinioStatus(node!, token!),
		enabled: ready,
		refetchInterval: 30000,
		retry: 1,
	});

	const bucketsQuery = useQuery({
		queryKey: ["minio-buckets", nodeId],
		queryFn: () => fetchMinioBuckets(node!, token!),
		enabled: ready && statusQuery.data?.available === true && statusQuery.data?.online === true,
		refetchInterval: 60000,
		retry: 1,
	});

	if (!statusQuery.data) {
		return (
			<div className="flex h-full items-center justify-center">
				<p className="text-sm text-muted-foreground">MinIOの状態を確認中...</p>
			</div>
		);
	}

	if (!statusQuery.data.available) {
		return (
			<div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-4 px-8 py-16 text-center">
				<Database className="h-12 w-12 text-muted-foreground/50" />
				<div>
					<h2 className="text-lg font-semibold">MinIOが設定されていません</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						このノードのサーバーAPIに環境変数 MINIO_ENDPOINT、MINIO_ACCESS_KEY、MINIO_SECRET_KEY を設定してください。
					</p>
				</div>
			</div>
		);
	}

	const isOnline = statusQuery.data.online;

	return (
		<div className="mx-auto flex h-full max-w-5xl flex-col gap-6 overflow-y-auto px-8 py-8">
			<header className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tightest">MinIO</h1>
					<p className="mt-1 text-sm text-muted-foreground">ストレージサーバーの状態とバケット一覧</p>
				</div>
				<Badge variant={isOnline ? "success" : "destructive"}>{isOnline ? "オンライン" : "オフライン"}</Badge>
			</header>

			{!isOnline && (
				<Card>
					<CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
						<HardDrive className="h-8 w-8" />
						<p>MinIOサーバーに接続できません。サーバーが起動しているか確認してください。</p>
					</CardContent>
				</Card>
			)}

			{isOnline && (
				<>
					{bucketsQuery.isLoading && (
						<p className="text-sm text-muted-foreground">バケット一覧を取得中...</p>
					)}

					{bucketsQuery.isError && (
						<p className="text-sm text-destructive">バケット一覧の取得に失敗しました。</p>
					)}

					{bucketsQuery.data?.buckets && bucketsQuery.data.buckets.length === 0 && (
						<Card>
							<CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
								<Package className="h-8 w-8" />
								<p>バケットが見つかりません。</p>
							</CardContent>
						</Card>
					)}

					{bucketsQuery.data?.buckets && bucketsQuery.data.buckets.length > 0 && (
						<EntityList>
							{bucketsQuery.data.buckets.map((bucket) => (
								<EntityListItem
									key={bucket.name}
									icon={Package}
									title={bucket.name}
									subtitle={`作成日時: ${new Date(bucket.creationDate).toLocaleString("ja-JP")}`}
								/>
							))}
						</EntityList>
					)}
				</>
			)}
		</div>
	);
}
