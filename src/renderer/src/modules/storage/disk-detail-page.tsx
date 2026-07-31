import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { DetailField } from "@renderer/components/common/detail-field";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import { NodeApiError, fetchStorageDisks } from "@renderer/lib/node-api-client";
import { formatBytes } from "@renderer/lib/utils";
import { useNodesStore } from "@renderer/state/nodes-store";
import { SmartStatusBadge } from "./shared";

export function DiskDetailPage() {
	const { nodeId, device: encodedDevice } = useParams<{ nodeId: string; device: string }>();
	const device = encodedDevice ? decodeURIComponent(encodedDevice) : undefined;
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);

	const ready = Boolean(node && token);

	const disksQuery = useQuery({
		queryKey: ["storage-disks", nodeId],
		queryFn: () => fetchStorageDisks(node!, token!),
		enabled: ready,
		retry: 1,
	});

	const disk = disksQuery.data?.find((d) => d.device === device);

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || disksQuery.isLoading) statusMessage = "接続中...";
	else if (disksQuery.isError)
		statusMessage =
			disksQuery.error instanceof NodeApiError ? disksQuery.error.message : "ノードに接続できませんでした。";
	else if (!disk) statusMessage = "物理ディスクが見つかりませんでした。一覧から選び直してください。";

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/storage`}
			backLabel="ストレージ一覧に戻る"
			title={disk?.name || device || "物理ディスク"}
			description={disk?.device !== disk?.name ? disk?.device : undefined}
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}

			{disk && (
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
					<DetailField label="S.M.A.R.T.状態" value={<SmartStatusBadge status={disk.smartStatus} />} />
					<DetailField label="種別" value={disk.type || "—"} />
					<DetailField label="ベンダー" value={disk.vendor || "—"} />
					<DetailField label="インターフェース" value={disk.interfaceType || "—"} />
					<DetailField label="容量" value={formatBytes(disk.sizeBytes)} />
					<DetailField
						label="温度"
						value={disk.temperatureCelsius !== null ? `${disk.temperatureCelsius}°C` : "取得不可"}
					/>
					<DetailField label="デバイスパス" value={<span className="font-mono text-xs">{disk.device}</span>} />
				</div>
			)}
		</DashboardPageLayout>
	);
}
