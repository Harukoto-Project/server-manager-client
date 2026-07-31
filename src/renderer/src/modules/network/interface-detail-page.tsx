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
import { useNodeMonitoring } from "@renderer/hooks/use-node-monitoring";
import { NodeApiError, fetchNetworkInterfaces } from "@renderer/lib/node-api-client";
import { formatBytes } from "@renderer/lib/utils";
import { useNodesStore } from "@renderer/state/nodes-store";
import { OperStateBadge } from "./shared";

export function InterfaceDetailPage() {
	const { nodeId, name: encodedName } = useParams<{ nodeId: string; name: string }>();
	const name = encodedName ? decodeURIComponent(encodedName) : undefined;
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);

	const ready = Boolean(node && token);

	const interfacesQuery = useQuery({
		queryKey: ["network-interfaces", nodeId],
		queryFn: () => fetchNetworkInterfaces(node!, token!),
		enabled: ready,
		refetchInterval: 10000,
		retry: 1,
	});

	const iface = interfacesQuery.data?.find((i) => i.name === name);

	// 現在のスループットは既存のモニタリングAPI(概要ページと同じsummary)から同一インターフェース名で拾う
	const { snapshot } = useNodeMonitoring();
	const throughput = snapshot?.network.find((n) => n.interface === name);

	const [rangeMinutes, setRangeMinutes] = useState(60);
	const { history, statusMessage: historyStatusMessage } = useMonitoringHistoryQuery(nodeId, rangeMinutes);
	const chartData = useMemo(
		() =>
			history
				.map((snap) => {
					const entry = snap.network.find((n) => n.interface === name);
					return entry ? { timestamp: snap.timestamp, rx: entry.rxBytesPerSec, tx: entry.txBytesPerSec } : null;
				})
				.filter((v): v is { timestamp: string; rx: number; tx: number } => v !== null),
		[history, name],
	);

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || interfacesQuery.isLoading) statusMessage = "接続中...";
	else if (interfacesQuery.isError)
		statusMessage =
			interfacesQuery.error instanceof NodeApiError
				? interfacesQuery.error.message
				: "ノードに接続できませんでした。";
	else if (!iface) statusMessage = "インターフェースが見つかりませんでした。一覧から選び直してください。";

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/network`}
			backLabel="ネットワーク一覧に戻る"
			title={iface?.displayName || name || "インターフェース"}
			description={iface?.name !== iface?.displayName ? iface?.name : undefined}
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}

			{throughput && (
				<Card className="mb-4">
					<CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
						<CardTitle className="text-sm">通信量の推移</CardTitle>
						<TimeRangeSelector value={rangeMinutes} onChange={setRangeMinutes} />
					</CardHeader>
					<CardContent>
						{historyStatusMessage && chartData.length === 0 ? (
							<p className="text-sm text-muted-foreground">{historyStatusMessage}</p>
						) : (
							<TimeSeriesChart
								data={chartData}
								series={[
									{ key: "rx", label: "受信 (↓)", color: "hsl(var(--primary))" },
									{ key: "tx", label: "送信 (↑)", color: "hsl(160 84% 39%)" },
								]}
								valueFormatter={(v) => `${formatBytes(v)}/s`}
							/>
						)}
					</CardContent>
				</Card>
			)}

			{iface && (
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
					<DetailField label="状態" value={<OperStateBadge operstate={iface.operstate} />} />
					<DetailField label="種別" value={iface.type || "—"} />
					<DetailField label="IPv4アドレス" value={iface.ip4 || "未割当"} />
					<DetailField label="IPv4サブネット" value={iface.ip4subnet || "—"} />
					<DetailField label="IPv6アドレス" value={iface.ip6 || "未割当"} />
					<DetailField label="MACアドレス" value={<span className="font-mono text-xs">{iface.mac || "—"}</span>} />
					<DetailField label="MTU" value={iface.mtu ?? "—"} />
					<DetailField label="速度" value={iface.speedMbps ? `${iface.speedMbps} Mbps` : "—"} />
					<DetailField label="デュプレックス" value={iface.duplex || "—"} />
					<DetailField label="DHCP" value={iface.dhcp ? "有効" : "無効(静的設定)"} />
					<DetailField label="デフォルトルート" value={iface.isDefault ? "はい" : "いいえ"} />
					<DetailField label="種別区分" value={iface.internal ? "内部(ループバック等)" : iface.virtual ? "仮想" : "物理"} />
					{throughput && (
						<>
							<DetailField label="現在の受信速度" value={`${formatBytes(throughput.rxBytesPerSec)}/s`} />
							<DetailField label="現在の送信速度" value={`${formatBytes(throughput.txBytesPerSec)}/s`} />
						</>
					)}
				</div>
			)}
		</DashboardPageLayout>
	);
}
