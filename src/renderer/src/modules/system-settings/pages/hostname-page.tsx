import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tag } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ConfirmDestructiveDialog } from "@renderer/components/common/confirm-destructive-dialog";
import { DetailField } from "@renderer/components/common/detail-field";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import { updateHostname } from "@renderer/lib/api/system-settings/basics";
import { NodeApiError, fetchSystemSettingsBasics } from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";

const HOSTNAME_PATTERN = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const inputClassName = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";

export function HostnamePage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();
	const ready = Boolean(node && token);

	const [newHostname, setNewHostname] = useState("");
	const [pending, setPending] = useState(false);
	const [actionError, setActionError] = useState<string | null>(null);
	const [validationError, setValidationError] = useState<string | null>(null);

	const basicsQuery = useQuery({
		queryKey: ["system-settings-basics", nodeId],
		queryFn: () => fetchSystemSettingsBasics(node!, token!),
		enabled: ready,
		retry: 1,
	});

	useEffect(() => {
		if (basicsQuery.data?.hostname) setNewHostname(basicsQuery.data.hostname);
	}, [basicsQuery.data?.hostname]);

	function validate(value: string): boolean {
		if (!value.trim() || !HOSTNAME_PATTERN.test(value.trim())) {
			setValidationError("英数字・ハイフン・ドットのみ使用できます(先頭・末尾のハイフンは不可)。");
			return false;
		}
		setValidationError(null);
		return true;
	}

	async function handleConfirm() {
		if (!node || !token) return;
		const trimmed = newHostname.trim();
		if (!validate(trimmed)) return;
		setActionError(null);
		setPending(true);
		try {
			await updateHostname(node, token, trimmed);
			await queryClient.invalidateQueries({ queryKey: ["system-settings-basics", nodeId] });
		} catch (error) {
			setActionError(error instanceof NodeApiError ? error.message : "ホスト名の変更に失敗しました。");
		} finally {
			setPending(false);
		}
	}

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || basicsQuery.isLoading) statusMessage = "接続中...";
	else if (basicsQuery.isError)
		statusMessage = basicsQuery.error instanceof NodeApiError ? basicsQuery.error.message : "ノードに接続できませんでした。";

	const currentHostname = basicsQuery.data?.hostname ?? "";
	const trimmedNew = newHostname.trim();
	const changed = trimmedNew.length > 0 && trimmedNew !== currentHostname;

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/system-settings`}
			backLabel="設定一覧に戻る"
			title="サーバー名(ホスト名)"
			description="このサーバーの名前を確認・変更します。"
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}
			{actionError && <p className="mb-4 text-sm text-destructive">{actionError}</p>}

			<div className="max-w-lg space-y-4">
				<DetailField label="現在のホスト名" value={currentHostname || "取得中..."} />

				<Card>
					<CardHeader>
						<CardTitle className="text-sm">ホスト名を変更</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="space-y-1">
							<label className="text-xs font-medium text-muted-foreground" htmlFor="hostname-input">
								新しいホスト名
							</label>
							<input
								id="hostname-input"
								value={newHostname}
								onChange={(e) => {
									setNewHostname(e.target.value);
									setValidationError(null);
								}}
								placeholder="my-server"
								className={`${inputClassName} font-mono`}
								disabled={!ready}
							/>
							{validationError && <p className="text-xs text-destructive">{validationError}</p>}
						</div>

						<ConfirmDestructiveDialog
							trigger={
								<Button size="sm" variant="destructive" disabled={!ready || !changed || pending}>
									<Tag className="h-4 w-4" /> {pending ? "変更中..." : "ホスト名を変更する"}
								</Button>
							}
							title={`ホスト名を「${trimmedNew}」に変更しますか?`}
							description="ホスト名の変更後、一部のサービスやターミナルのプロンプトに反映されるまで再接続が必要になる場合があります。"
							confirmLabel="変更する"
							onConfirm={handleConfirm}
						/>
					</CardContent>
				</Card>
			</div>
		</DashboardPageLayout>
	);
}
