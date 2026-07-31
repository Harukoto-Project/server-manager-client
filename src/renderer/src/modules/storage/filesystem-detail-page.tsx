import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { DetailField } from "@renderer/components/common/detail-field";
import { TimeRangeSelector } from "@renderer/components/common/time-range-selector";
import { TimeSeriesChart } from "@renderer/components/common/time-series-chart";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { useMonitoringHistoryQuery } from "@renderer/hooks/use-monitoring-history-query";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import { NodeApiError, fetchStorageFilesystems } from "@renderer/lib/node-api-client";
import { formatBytes } from "@renderer/lib/utils";
import { useNodesStore } from "@renderer/state/nodes-store";
import { RwBadge } from "./shared";

export function FilesystemDetailPage() {
	const { nodeId, mount: encodedMount } = useParams<{ nodeId: string; mount: string }>();
	const mount = encodedMount ? decodeURIComponent(encodedMount) : undefined;
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);

	const ready = Boolean(node && token);

	const filesystemsQuery = useQuery({
		queryKey: ["storage-filesystems", nodeId],
		queryFn: () => fetchStorageFilesystems(node!, token!),
		enabled: ready,
		refetchInterval: 10000,
		retry: 1,
	});

	const filesystem = filesystemsQuery.data?.find((fs) => fs.mount === mount);

	// 使用率の推移はモニタリング履歴API(概要/ネットワークモジュールと同じ)の disks[] から拾う
	const [rangeMinutes, setRangeMinutes] = useState(60);
	const { history, statusMessage: historyStatusMessage } = useMonitoringHistoryQuery(nodeId, rangeMinutes);
	const chartData = useMemo(
		() =>
			history
				.map((snap) => {
					const entry = snap.disks.find((d) => d.mount === mount);
					return entry ? { timestamp: snap.timestamp, usedPercent: entry.usedPercent } : null;
				})
				.filter((v): v is { timestamp: string; usedPercent: number } => v !== null),
		[history, mount],
	);

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || filesystemsQuery.isLoading) statusMessage = "接続中...";
	else if (filesystemsQuery.isError)
		statusMessage =
			filesystemsQuery.error instanceof NodeApiError
				? filesystemsQuery.error.message
				: "ノードに接続できませんでした。";
	else if (!filesystem) statusMessage = "ファイルシステムが見つかりませんでした。一覧から選び直してください。";

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/storage`}
			backLabel="ストレージ一覧に戻る"
			title={mount ?? "ファイルシステム"}
			description={filesystem ? `${filesystem.fs} (${filesystem.type})` : undefined}
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}

			<Card className="mb-4">
				<CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
					<CardTitle className="text-sm">使用率の推移(サーバーに記録された履歴)</CardTitle>
					<TimeRangeSelector value={rangeMinutes} onChange={setRangeMinutes} />
				</CardHeader>
				<CardContent>
					{historyStatusMessage && chartData.length === 0 ? (
						<p className="text-sm text-muted-foreground">{historyStatusMessage}</p>
					) : (
						<TimeSeriesChart
							data={chartData}
							series={[{ key: "usedPercent", label: "使用率", color: "hsl(var(--primary))" }]}
							yDomain={[0, 100]}
							valueFormatter={(v) => `${v.toFixed(0)}%`}
						/>
					)}
				</CardContent>
			</Card>

			{filesystem && (
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
					<DetailField label="使用率" value={`${filesystem.usedPercent.toFixed(1)}%`} />
					<DetailField label="使用中" value={formatBytes(filesystem.usedBytes)} />
					<DetailField label="空き" value={formatBytes(filesystem.availableBytes)} />
					<DetailField label="合計" value={formatBytes(filesystem.sizeBytes)} />
					<DetailField label="デバイス" value={<span className="font-mono text-xs">{filesystem.fs}</span>} />
					<DetailField label="ファイルシステム種別" value={filesystem.type} />
					<DetailField label="マウント状態" value={<RwBadge rw={filesystem.rw} />} />
				</div>
			)}
		</DashboardPageLayout>
	);
}
