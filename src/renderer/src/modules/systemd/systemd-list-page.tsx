import { useQuery } from "@tanstack/react-query";
import { Layers3 } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { EntityList, EntityListItem } from "@renderer/components/common/entity-list";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Card, CardContent } from "@renderer/components/ui/card";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import { NodeApiError, fetchSystemdUnits } from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";
import { UnitStateBadge } from "./shared";

export function SystemdListPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const navigate = useNavigate();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);

	const [filter, setFilter] = useState("");
	const ready = Boolean(node && token);

	const unitsQuery = useQuery({
		queryKey: ["systemd-units", nodeId],
		queryFn: () => fetchSystemdUnits(node!, token!),
		enabled: ready,
		refetchInterval: 8000,
		retry: 1,
	});

	const filteredUnits = useMemo(() => {
		const units = unitsQuery.data ?? [];
		if (!filter.trim()) return units;
		const needle = filter.trim().toLowerCase();
		return units.filter(
			(u) => u.unit.toLowerCase().includes(needle) || u.description.toLowerCase().includes(needle),
		);
	}, [unitsQuery.data, filter]);

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || unitsQuery.isLoading) statusMessage = "接続中...";
	else if (unitsQuery.isError)
		statusMessage = unitsQuery.error instanceof NodeApiError ? unitsQuery.error.message : "ノードに接続できませんでした。";

	return (
		<DashboardPageLayout
			title="systemdサービス"
			description="行をクリックするとサービスの詳細ページ(起動/停止/再起動・有効化・ログ)に移動します。"
			actions={
				<input
					value={filter}
					onChange={(e) => setFilter(e.target.value)}
					placeholder="サービス名で絞り込み"
					className="w-56 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
				/>
			}
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}

			{ready && !unitsQuery.isLoading && filteredUnits.length === 0 && (
				<Card>
					<CardContent className="py-6 text-sm text-muted-foreground">
						{filter ? "条件に一致するサービスが見つかりませんでした。" : "サービスが見つかりませんでした。"}
					</CardContent>
				</Card>
			)}

			{filteredUnits.length > 0 && (
				<EntityList>
					{filteredUnits.map((unit) => (
						<EntityListItem
							key={unit.unit}
							icon={Layers3}
							title={unit.unit}
							subtitle={unit.description || undefined}
							badge={<UnitStateBadge active={unit.active} />}
							onClick={() => navigate(`units/${encodeURIComponent(unit.unit)}`)}
						/>
					))}
				</EntityList>
			)}
		</DashboardPageLayout>
	);
}
