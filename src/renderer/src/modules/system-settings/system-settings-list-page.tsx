import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { EntityList, EntityListItem } from "@renderer/components/common/entity-list";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import {
	NodeApiError,
	fetchSystemSettingsAptUpdates,
	fetchSystemSettingsBasics,
	fetchSystemSettingsUfwStatus,
} from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";
import { SYSTEM_SETTINGS_GROUPS, SYSTEM_SETTINGS_GROUP_LABEL, systemSettingsCategories } from "./categories";

export function SystemSettingsListPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const navigate = useNavigate();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const ready = Boolean(node && token);

	const basicsQuery = useQuery({
		queryKey: ["system-settings-basics", nodeId],
		queryFn: () => fetchSystemSettingsBasics(node!, token!),
		enabled: ready,
		retry: 1,
	});

	const aptUpdatesQuery = useQuery({
		queryKey: ["system-settings-apt-updates", nodeId],
		queryFn: () => fetchSystemSettingsAptUpdates(node!, token!),
		enabled: ready,
		retry: 1,
	});

	const ufwStatusQuery = useQuery({
		queryKey: ["system-settings-ufw-status", nodeId],
		queryFn: () => fetchSystemSettingsUfwStatus(node!, token!),
		enabled: ready,
		retry: 1,
	});

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading) statusMessage = "接続中...";
	else if (basicsQuery.isError)
		statusMessage = basicsQuery.error instanceof NodeApiError ? basicsQuery.error.message : "ノードに接続できませんでした。";

	function subtitleFor(categoryId: string, fallback: string): string {
		if (categoryId === "apt-updates") {
			if (aptUpdatesQuery.isLoading) return "更新可能なパッケージを確認中...";
			if (aptUpdatesQuery.data) {
				return aptUpdatesQuery.data.length > 0
					? `更新可能なパッケージが${aptUpdatesQuery.data.length}件あります`
					: "すべて最新の状態です";
			}
			return fallback;
		}
		if (categoryId === "hostname") {
			return basicsQuery.data?.hostname ? `現在のサーバー名: ${basicsQuery.data.hostname}` : fallback;
		}
		if (categoryId === "datetime") {
			return basicsQuery.data?.timezone ? `現在のタイムゾーン: ${basicsQuery.data.timezone}` : fallback;
		}
		if (categoryId === "firewall") {
			if (ufwStatusQuery.isLoading) return "状態を確認中...";
			if (ufwStatusQuery.data !== undefined) {
				return /Status:\s*active/i.test(ufwStatusQuery.data) ? "ファイアウォールは有効です" : "ファイアウォールは無効です";
			}
			return fallback;
		}
		return fallback;
	}

	return (
		<DashboardPageLayout
			title="システム設定"
			description="サーバーの基本設定・アカウント・セキュリティ・ネットワーク・メンテナンスに関する設定をまとめて管理します。行をクリックすると各設定ページに移動します。"
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}

			<div className="space-y-6">
				{SYSTEM_SETTINGS_GROUPS.map((group) => {
					const items = systemSettingsCategories.filter((category) => category.group === group);
					if (items.length === 0) return null;
					return (
						<div key={group}>
							<h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								{SYSTEM_SETTINGS_GROUP_LABEL[group]}
							</h2>
							<EntityList>
								{items.map((category) => (
									<EntityListItem
										key={category.id}
										icon={category.icon}
										title={category.label}
										subtitle={subtitleFor(category.id, category.description)}
										onClick={() => navigate(`settings/${category.id}`)}
									/>
								))}
							</EntityList>
						</div>
					);
				})}
			</div>
		</DashboardPageLayout>
	);
}
