import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PackageCheck, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { ConfirmDestructiveDialog } from "@renderer/components/common/confirm-destructive-dialog";
import { ConsoleLogViewer } from "@renderer/components/common/console-log-viewer";
import { EntityList, EntityListItem } from "@renderer/components/common/entity-list";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Badge } from "@renderer/components/ui/badge";
import { Button } from "@renderer/components/ui/button";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import { applyAptUpgrade } from "@renderer/lib/api/system-settings/basics";
import { NodeApiError, fetchSystemSettingsAptUpdates } from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";

export function AptUpdatesPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();
	const ready = Boolean(node && token);

	const [pending, setPending] = useState(false);
	const [actionError, setActionError] = useState<string | null>(null);
	const [upgradeOutput, setUpgradeOutput] = useState<string[] | null>(null);

	const updatesQuery = useQuery({
		queryKey: ["system-settings-apt-updates", nodeId],
		queryFn: () => fetchSystemSettingsAptUpdates(node!, token!),
		enabled: ready,
		retry: 1,
	});

	async function handleUpgrade() {
		if (!node || !token) return;
		setActionError(null);
		setPending(true);
		try {
			const result = await applyAptUpgrade(node, token);
			setUpgradeOutput(result.output.split("\n").filter((line) => line.length > 0));
			await queryClient.invalidateQueries({ queryKey: ["system-settings-apt-updates", nodeId] });
		} catch (error) {
			setActionError(error instanceof NodeApiError ? error.message : "更新の適用に失敗しました。");
		} finally {
			setPending(false);
		}
	}

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || updatesQuery.isLoading) statusMessage = "更新可能なパッケージを確認中...";
	else if (updatesQuery.isError)
		statusMessage = updatesQuery.error instanceof NodeApiError ? updatesQuery.error.message : "ノードに接続できませんでした。";

	const packages = updatesQuery.data ?? [];

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/system-settings`}
			backLabel="設定一覧に戻る"
			title="アップデートの確認・適用"
			description="インストール済みソフトウェアの更新確認と適用を行います。"
			actions={
				<>
					<Button
						size="sm"
						variant="outline"
						disabled={!ready || updatesQuery.isFetching}
						onClick={() => updatesQuery.refetch()}
					>
						<RefreshCw className="h-4 w-4" /> 再確認
					</Button>
					<ConfirmDestructiveDialog
						trigger={
							<Button size="sm" variant="destructive" disabled={!ready || packages.length === 0 || pending}>
								<PackageCheck className="h-4 w-4" /> {pending ? "更新中..." : "今すぐ更新する"}
							</Button>
						}
						title="パッケージを更新しますか?"
						description={`更新可能な${packages.length}件のパッケージを一括で適用します。サービスに影響する場合があるため、事前にバックアップを推奨します。`}
						confirmLabel="更新を適用する"
						onConfirm={handleUpgrade}
					/>
				</>
			}
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}
			{actionError && <p className="mb-4 text-sm text-destructive">{actionError}</p>}

			<div className="space-y-4">
				<EntityList>
					{packages.length === 0 && !updatesQuery.isLoading ? (
						<div className="px-4 py-6 text-center text-sm text-muted-foreground">すべて最新の状態です</div>
					) : (
						packages.map((pkg) => (
							<EntityListItem
								key={pkg}
								icon={PackageCheck}
								title={pkg}
								badge={<Badge variant="secondary">更新可能</Badge>}
							/>
						))
					)}
				</EntityList>

				{upgradeOutput && (
					<div>
						<p className="mb-2 text-sm font-medium">更新結果</p>
						<ConsoleLogViewer lines={upgradeOutput} emptyLabel="出力はありません" />
					</div>
				)}
			</div>
		</DashboardPageLayout>
	);
}
