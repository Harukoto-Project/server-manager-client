import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { ConfirmDestructiveDialog } from "@renderer/components/common/confirm-destructive-dialog";
import { DetailField } from "@renderer/components/common/detail-field";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Badge } from "@renderer/components/ui/badge";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { Switch } from "@renderer/components/ui/switch";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import {
	disableIntrusionPrevention,
	enableIntrusionPrevention,
	fetchIntrusionPreventionStatus,
	installIntrusionPrevention,
} from "@renderer/lib/api/system-settings/intrusion-prevention";
import { NodeApiError } from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";

export function IntrusionPreventionPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();

	const [pending, setPending] = useState(false);
	const [actionError, setActionError] = useState<string | null>(null);

	const ready = Boolean(node && token);

	const statusQuery = useQuery({
		queryKey: ["intrusion-prevention-status", nodeId],
		queryFn: () => fetchIntrusionPreventionStatus(node!, token!),
		enabled: ready,
		refetchInterval: 10000,
		retry: 1,
	});

	async function refresh() {
		await queryClient.invalidateQueries({ queryKey: ["intrusion-prevention-status", nodeId] });
	}

	async function handleInstall() {
		if (!node || !token) return;
		setPending(true);
		setActionError(null);
		try {
			await installIntrusionPrevention(node, token);
			await refresh();
		} catch (error) {
			setActionError(error instanceof NodeApiError ? error.message : "インストールに失敗しました。");
		} finally {
			setPending(false);
		}
	}

	async function handleToggle(nextEnabled: boolean) {
		if (!node || !token) return;
		setPending(true);
		setActionError(null);
		try {
			if (nextEnabled) {
				await enableIntrusionPrevention(node, token);
			} else {
				await disableIntrusionPrevention(node, token);
			}
			await refresh();
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

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/system-settings`}
			backLabel="設定一覧に戻る"
			title="不正アクセス防止"
			description="fail2banによるログイン試行失敗の検知・自動遮断を設定します。"
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}
			{actionError && <p className="mb-4 text-sm text-destructive">{actionError}</p>}

			{status && !status.installed && (
				<Card>
					<CardContent className="flex flex-col items-center gap-3 py-16 text-center">
						<p className="text-sm font-medium">fail2banはインストールされていません</p>
						<p className="max-w-md text-xs text-muted-foreground">
							インストールすると、ログイン試行の失敗を検知して該当するIPアドレスを自動的に遮断できるようになります。
						</p>
						<Button disabled={pending} onClick={handleInstall}>
							{pending ? "インストール中..." : "fail2banをインストール"}
						</Button>
					</CardContent>
				</Card>
			)}

			{status && status.installed && (
				<div className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">状態</CardTitle>
						</CardHeader>
						<CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
							<DetailField label="パッケージ" value={<Badge variant="success">インストール済み</Badge>} />
							<DetailField
								label="稼働状態"
								value={<Badge variant={status.active ? "success" : "secondary"}>{status.active ? "稼働中" : "停止中"}</Badge>}
							/>
							<DetailField
								label="自動起動"
								value={<Badge variant={status.enabled ? "success" : "secondary"}>{status.enabled ? "有効" : "無効"}</Badge>}
							/>
							<DetailField
								label="監視中のjail"
								value={status.jails.length > 0 ? status.jails.join(", ") : "—"}
								className="col-span-2 sm:col-span-3"
							/>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-sm">fail2banの有効化・無効化</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex items-center justify-between rounded-lg border bg-card p-3">
								<div>
									<p className="text-sm font-medium">不正アクセス防止を有効にする</p>
									<p className="text-xs text-muted-foreground">
										無効化すると、ログイン試行失敗の自動検知・遮断が行われなくなります。
									</p>
								</div>
								{status.enabled ? (
									<ConfirmDestructiveDialog
										trigger={<Switch checked={status.enabled} disabled={pending} />}
										title="不正アクセス防止を無効化しますか?"
										description="無効化すると、ログイン試行失敗の自動検知・遮断が停止します。"
										confirmLabel="無効化する"
										onConfirm={() => handleToggle(false)}
									/>
								) : (
									<Switch checked={status.enabled} disabled={pending} onCheckedChange={handleToggle} />
								)}
							</div>
						</CardContent>
					</Card>
				</div>
			)}
		</DashboardPageLayout>
	);
}
