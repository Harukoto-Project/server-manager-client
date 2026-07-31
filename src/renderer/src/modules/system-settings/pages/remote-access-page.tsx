import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ConfirmDestructiveDialog } from "@renderer/components/common/confirm-destructive-dialog";
import { DetailField } from "@renderer/components/common/detail-field";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import {
	type UpdateSshConfigInput,
	fetchSshConfig,
	updateSshConfig,
} from "@renderer/lib/api/system-settings/remote-access";
import { NodeApiError } from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";

const inputClassName = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";

export function RemoteAccessPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();

	const [port, setPort] = useState("");
	const [permitRootLogin, setPermitRootLogin] = useState<UpdateSshConfigInput["permitRootLogin"]>("no");
	const [passwordAuthentication, setPasswordAuthentication] = useState<UpdateSshConfigInput["passwordAuthentication"]>(
		"yes",
	);
	const [applyError, setApplyError] = useState<string | null>(null);
	const [applyPending, setApplyPending] = useState(false);
	const [synced, setSynced] = useState(false);

	const ready = Boolean(node && token);

	const configQuery = useQuery({
		queryKey: ["system-settings-ssh-config", nodeId],
		queryFn: () => fetchSshConfig(node!, token!),
		enabled: ready,
		retry: 1,
	});

	useEffect(() => {
		if (configQuery.data && !synced) {
			setPort(configQuery.data.port);
			if (configQuery.data.permitRootLogin === "yes" || configQuery.data.permitRootLogin === "no") {
				setPermitRootLogin(configQuery.data.permitRootLogin);
			}
			if (configQuery.data.passwordAuthentication === "yes" || configQuery.data.passwordAuthentication === "no") {
				setPasswordAuthentication(configQuery.data.passwordAuthentication);
			}
			setSynced(true);
		}
	}, [configQuery.data, synced]);

	async function handleApply() {
		if (!node || !token) return;
		const portNumber = Number(port);
		if (!Number.isInteger(portNumber) || portNumber < 1 || portNumber > 65535) {
			setApplyError("ポート番号は1〜65535の整数で指定してください。");
			return;
		}
		setApplyPending(true);
		setApplyError(null);
		try {
			await updateSshConfig(node, token, { port: portNumber, permitRootLogin, passwordAuthentication });
			await queryClient.invalidateQueries({ queryKey: ["system-settings-ssh-config", nodeId] });
		} catch (error) {
			setApplyError(error instanceof NodeApiError ? error.message : "SSH設定の変更に失敗しました。");
		} finally {
			setApplyPending(false);
		}
	}

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || configQuery.isLoading) statusMessage = "接続中...";
	else if (configQuery.isError)
		statusMessage = configQuery.error instanceof NodeApiError ? configQuery.error.message : "ノードに接続できませんでした。";

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/system-settings`}
			backLabel="設定一覧に戻る"
			title="リモート接続(SSH)の設定"
			description="遠隔操作用の接続方法(ポート番号やログイン方法)を設定します。設定を誤るとSSH接続そのものができなくなる可能性があるため、変更内容は十分に確認してください。"
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}

			<div className="mb-6 grid gap-3 sm:grid-cols-3">
				<DetailField label="現在のポート" value={configQuery.data?.port ?? "—"} />
				<DetailField label="現在のrootログイン許可" value={configQuery.data?.permitRootLogin ?? "—"} />
				<DetailField label="現在のパスワード認証" value={configQuery.data?.passwordAuthentication ?? "—"} />
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm">設定を変更</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="ssh-port">
							ポート番号
						</label>
						<input
							id="ssh-port"
							value={port}
							onChange={(e) => setPort(e.target.value)}
							placeholder="22"
							className={`${inputClassName} font-mono`}
						/>
					</div>

					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="ssh-root-login">
							rootログインの許可
						</label>
						<select
							id="ssh-root-login"
							value={permitRootLogin}
							onChange={(e) => setPermitRootLogin(e.target.value as UpdateSshConfigInput["permitRootLogin"])}
							className={inputClassName}
						>
							<option value="no">許可しない(推奨)</option>
							<option value="prohibit-password">パスワードログインのみ禁止</option>
							<option value="yes">許可する</option>
						</select>
					</div>

					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="ssh-password-auth">
							パスワード認証
						</label>
						<select
							id="ssh-password-auth"
							value={passwordAuthentication}
							onChange={(e) =>
								setPasswordAuthentication(e.target.value as UpdateSshConfigInput["passwordAuthentication"])
							}
							className={inputClassName}
						>
							<option value="yes">許可する</option>
							<option value="no">許可しない(鍵認証のみ、推奨)</option>
						</select>
					</div>

					{applyError && <p className="text-sm text-destructive">{applyError}</p>}

					<div className="flex justify-end">
						<ConfirmDestructiveDialog
							trigger={
								<Button disabled={!ready || applyPending}>{applyPending ? "適用中..." : "設定を適用する"}</Button>
							}
							title="SSH設定を変更しますか?"
							description="設定内容に誤りがある場合、SSH接続ができなくなる可能性があります。変更は/etc/ssh/sshd_config.d/の専用ファイルに書き込まれ、事前に構文検証(sshd -t)を行いますが、内容(ポート番号やログイン方法)自体は十分に確認してから適用してください。"
							confirmLabel="適用する"
							onConfirm={handleApply}
						/>
					</div>
				</CardContent>
			</Card>
		</DashboardPageLayout>
	);
}
