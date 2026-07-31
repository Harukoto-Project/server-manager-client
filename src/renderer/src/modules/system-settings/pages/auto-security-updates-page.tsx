import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { ConfirmDestructiveDialog } from "@renderer/components/common/confirm-destructive-dialog";
import { DetailField } from "@renderer/components/common/detail-field";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Badge } from "@renderer/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { Switch } from "@renderer/components/ui/switch";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import {
	disableAutoSecurityUpdates,
	enableAutoSecurityUpdates,
	fetchAutoSecurityUpdatesStatus,
} from "@renderer/lib/api/system-settings/auto-security-updates";
import { NodeApiError } from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";

export function AutoSecurityUpdatesPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();

	const [pending, setPending] = useState(false);
	const [actionError, setActionError] = useState<string | null>(null);

	const ready = Boolean(node && token);

	const statusQuery = useQuery({
		queryKey: ["auto-security-updates-status", nodeId],
		queryFn: () => fetchAutoSecurityUpdatesStatus(node!, token!),
		enabled: ready,
		refetchInterval: 10000,
		retry: 1,
	});

	async function handleToggle(nextEnabled: boolean) {
		if (!node || !token) return;
		setPending(true);
		setActionError(null);
		try {
			if (nextEnabled) {
				await enableAutoSecurityUpdates(node, token);
			} else {
				await disableAutoSecurityUpdates(node, token);
			}
			await queryClient.invalidateQueries({ queryKey: ["auto-security-updates-status", nodeId] });
		} catch (error) {
			setActionError(error instanceof NodeApiError ? error.message : "設定の変更に失敗しました。");
		} finally {
			setPending(false);
		}
	}

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || statusQuery.isLoading) statusMessage = "接続中...";
	else if (statusQuery.isError)
		statusMessage = statusQuery.error instanceof NodeApiError ? statusQuery.error.message : "ノードに接続できませんでした。";

	const status = statusQuery.data;
	const enabled = Boolean(status?.unattendedUpgradeEnabled);

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/system-settings`}
			backLabel="設定一覧に戻る"
			title="自動セキュリティ更新"
			description="unattended-upgradesによる重要な更新の自動適用を設定します。"
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}
			{actionError && <p className="mb-4 text-sm text-destructive">{actionError}</p>}

			{status && (
				<div className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">状態</CardTitle>
						</CardHeader>
						<CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
							<DetailField
								label="パッケージ"
								value={<Badge variant={status.installed ? "success" : "secondary"}>{status.installed ? "インストール済み" : "未インストール"}</Badge>}
							/>
							<DetailField
								label="自動セキュリティ更新"
								value={<Badge variant={enabled ? "success" : "secondary"}>{enabled ? "有効" : "無効"}</Badge>}
							/>
							<DetailField
								label="パッケージリストの自動更新"
								value={
									<Badge variant={status.updatePackageListsEnabled ? "success" : "secondary"}>
										{status.updatePackageListsEnabled ? "有効" : "無効"}
									</Badge>
								}
							/>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-sm">自動セキュリティ更新の切り替え</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex items-center justify-between rounded-lg border bg-card p-3">
								<div>
									<p className="text-sm font-medium">重要な更新を自動的に適用する</p>
									<p className="text-xs text-muted-foreground">
										{status.installed
											? "unattended-upgradesはインストール済みです。"
											: "有効化するとunattended-upgradesが自動的にインストールされます。"}
									</p>
								</div>
								{enabled ? (
									<ConfirmDestructiveDialog
										trigger={<Switch checked={enabled} disabled={pending} />}
										title="自動セキュリティ更新を無効化しますか?"
										description="無効化すると、重要な修正が自動的には適用されなくなります。手動で更新を確認・適用する運用に切り替わります。"
										confirmLabel="無効化する"
										onConfirm={() => handleToggle(false)}
									/>
								) : (
									<Switch checked={enabled} disabled={pending} onCheckedChange={handleToggle} />
								)}
							</div>
						</CardContent>
					</Card>
				</div>
			)}
		</DashboardPageLayout>
	);
}
