import { useQuery } from "@tanstack/react-query";
import { HardDrive, Layers, Server } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { EntityList, EntityListItem } from "@renderer/components/common/entity-list";
import { TimeSeriesChart } from "@renderer/components/common/time-series-chart";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@renderer/components/ui/tabs";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import { useStorageIoHistory } from "@renderer/hooks/use-storage-io-history";
import {
	NodeApiError,
	fetchStorageBlockDevices,
	fetchStorageDisks,
	fetchStorageFilesystems,
	fetchStorageIo,
} from "@renderer/lib/node-api-client";
import { formatBytes } from "@renderer/lib/utils";
import { useNodesStore } from "@renderer/state/nodes-store";
import { SmartStatusBadge } from "./shared";

export function StorageListPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const navigate = useNavigate();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);

	const [activeTab, setActiveTab] = useState("filesystems");
	const ready = Boolean(node && token);

	const filesystemsQuery = useQuery({
		queryKey: ["storage-filesystems", nodeId],
		queryFn: () => fetchStorageFilesystems(node!, token!),
		enabled: ready,
		refetchInterval: 10000,
		retry: 1,
	});

	const disksQuery = useQuery({
		queryKey: ["storage-disks", nodeId],
		queryFn: () => fetchStorageDisks(node!, token!),
		enabled: ready && activeTab === "disks",
		retry: 1,
	});

	const blockDevicesQuery = useQuery({
		queryKey: ["storage-block-devices", nodeId],
		queryFn: () => fetchStorageBlockDevices(node!, token!),
		enabled: ready && activeTab === "block-devices",
		retry: 1,
	});

	const ioQuery = useQuery({
		queryKey: ["storage-io", nodeId],
		queryFn: () => fetchStorageIo(node!, token!),
		enabled: ready,
		refetchInterval: 3000,
		retry: 1,
	});
	const ioHistory = useStorageIoHistory(nodeId, ioQuery.data);
	const ioChartData = ioHistory.map((snap) => ({
		timestamp: snap.timestamp,
		read: snap.readOpsPerSec ?? 0,
		write: snap.writeOpsPerSec ?? 0,
	}));

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || filesystemsQuery.isLoading) statusMessage = "接続中...";
	else if (filesystemsQuery.isError)
		statusMessage =
			filesystemsQuery.error instanceof NodeApiError
				? filesystemsQuery.error.message
				: "ノードに接続できませんでした。";

	return (
		<DashboardPageLayout
			title="ストレージ"
			description="ファイルシステム・物理ディスク・ブロックデバイスを確認できます。行をクリックすると詳細ページに移動します。"
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}

			{ioQuery.data && ioQuery.data.totalOpsPerSec !== null && (
				<Card className="mb-4">
					<CardHeader>
						<CardTitle className="text-sm">ディスクI/Oの推移(全ディスク合計、このページを開いている間の記録)</CardTitle>
					</CardHeader>
					<CardContent>
						<TimeSeriesChart
							data={ioChartData}
							series={[
								{ key: "read", label: "読み取り (IOPS)", color: "hsl(var(--primary))" },
								{ key: "write", label: "書き込み (IOPS)", color: "hsl(160 84% 39%)" },
							]}
							valueFormatter={(v) => `${v.toFixed(0)}`}
						/>
					</CardContent>
				</Card>
			)}

			<Tabs value={activeTab} onValueChange={setActiveTab}>
				<TabsList>
					<TabsTrigger value="filesystems">ファイルシステム</TabsTrigger>
					<TabsTrigger value="disks">物理ディスク</TabsTrigger>
					<TabsTrigger value="block-devices">ブロックデバイス</TabsTrigger>
				</TabsList>

				<TabsContent value="filesystems">
					{ready && !filesystemsQuery.isLoading && filesystemsQuery.data?.length === 0 && (
						<p className="text-sm text-muted-foreground">ファイルシステムが見つかりませんでした。</p>
					)}
					{filesystemsQuery.data && filesystemsQuery.data.length > 0 && (
						<EntityList>
							{filesystemsQuery.data.map((fs) => (
								<EntityListItem
									key={fs.mount}
									icon={HardDrive}
									title={fs.mount}
									subtitle={`${fs.fs} (${fs.type})`}
									meta={`${formatBytes(fs.usedBytes)} / ${formatBytes(fs.sizeBytes)} (${fs.usedPercent.toFixed(1)}%)`}
									onClick={() => navigate(`filesystems/${encodeURIComponent(fs.mount)}`)}
								/>
							))}
						</EntityList>
					)}
				</TabsContent>

				<TabsContent value="disks">
					{disksQuery.isLoading && <p className="text-sm text-muted-foreground">読み込み中...</p>}
					{disksQuery.data?.length === 0 && (
						<p className="text-sm text-muted-foreground">物理ディスクが見つかりませんでした。</p>
					)}
					{disksQuery.data && disksQuery.data.length > 0 && (
						<EntityList>
							{disksQuery.data.map((disk) => (
								<EntityListItem
									key={disk.device}
									icon={Server}
									title={disk.name || disk.device}
									subtitle={`${disk.vendor ? `${disk.vendor} / ` : ""}${disk.interfaceType || disk.type}`}
									meta={formatBytes(disk.sizeBytes)}
									badge={<SmartStatusBadge status={disk.smartStatus} />}
									onClick={() => navigate(`disks/${encodeURIComponent(disk.device)}`)}
								/>
							))}
						</EntityList>
					)}
				</TabsContent>

				<TabsContent value="block-devices">
					{blockDevicesQuery.isLoading && <p className="text-sm text-muted-foreground">読み込み中...</p>}
					{blockDevicesQuery.data?.length === 0 && (
						<p className="text-sm text-muted-foreground">ブロックデバイスが見つかりませんでした。</p>
					)}
					{blockDevicesQuery.data && blockDevicesQuery.data.length > 0 && (
						<EntityList>
							{blockDevicesQuery.data.map((device) => (
								<EntityListItem
									key={device.identifier}
									icon={Layers}
									title={device.name}
									subtitle={
										device.mount
											? `${device.fsType || "不明"} → ${device.mount}`
											: device.fsType || "未マウント"
									}
									meta={formatBytes(device.sizeBytes)}
								/>
							))}
						</EntityList>
					)}
				</TabsContent>
			</Tabs>
		</DashboardPageLayout>
	);
}
