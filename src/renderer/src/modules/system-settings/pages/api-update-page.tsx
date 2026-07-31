import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, DownloadCloud, Loader2, Save, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ConfirmDestructiveDialog } from "@renderer/components/common/confirm-destructive-dialog";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import { type ApiUpdateResult, triggerApiUpdate } from "@renderer/lib/api/update";
import { NodeApiError, fetchNodeHealth } from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";

type UpdatePhase = "idle" | "running" | "waiting-restart" | "reconnected" | "failed";

export function ApiUpdatePage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const updateNode = useNodesStore((s) => s.updateNode);
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();
	const ready = Boolean(node && token);

	const [installPathInput, setInstallPathInput] = useState("");
	const [savingPath, setSavingPath] = useState(false);
	const [saved, setSaved] = useState(false);

	const [phase, setPhase] = useState<UpdatePhase>("idle");
	const [result, setResult] = useState<ApiUpdateResult | null>(null);
	const [runError, setRunError] = useState<string | null>(null);

	useEffect(() => {
		setInstallPathInput(node?.apiInstallPath ?? "");
	}, [node?.apiInstallPath]);

	const healthQuery = useQuery({
		queryKey: ["api-update-health", nodeId],
		queryFn: () => fetchNodeHealth(node!),
		enabled: ready,
		retry: 1,
	});

	const reconnectQuery = useQuery({
		queryKey: ["api-update-reconnect", nodeId],
		queryFn: () => fetchNodeHealth(node!),
		enabled: Boolean(node) && phase === "waiting-restart",
		refetchInterval: phase === "waiting-restart" ? 3000 : false,
		retry: 0,
	});

	useEffect(() => {
		if (phase === "waiting-restart" && reconnectQuery.isSuccess) {
			setPhase("reconnected");
			void queryClient.invalidateQueries({ queryKey: ["api-update-health", nodeId] });
		}
	}, [phase, reconnectQuery.isSuccess, queryClient, nodeId]);

	async function handleSaveInstallPath() {
		if (!node) return;
		setSavingPath(true);
		setSaved(false);
		try {
			await updateNode(node.id, {
				apiInstallPath: installPathInput.trim() === "" ? undefined : installPathInput.trim(),
			});
			setSaved(true);
		} finally {
			setSavingPath(false);
		}
	}

	async function handleRunUpdate() {
		if (!node || !token || !node.apiInstallPath) return;
		setRunError(null);
		setResult(null);
		setPhase("running");
		try {
			const updateResult = await triggerApiUpdate(node, token, node.apiInstallPath);
			setResult(updateResult);
			if (updateResult.ok) {
				setPhase("waiting-restart");
				setTimeout(() => {
					void reconnectQuery.refetch();
				}, 5000);
			} else {
				setPhase("failed");
			}
		} catch (error) {
			setRunError(error instanceof NodeApiError ? error.message : "更新の実行に失敗しました。");
			setPhase("failed");
		}
	}

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || healthQuery.isLoading) statusMessage = "接続中...";
	else if (healthQuery.isError)
		statusMessage = healthQuery.error instanceof NodeApiError ? healthQuery.error.message : "ノードに接続できませんでした。";

	const hasInstallPath = Boolean(node?.apiInstallPath);
	const isRunning = phase === "running";

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/system-settings`}
			backLabel="設定一覧に戻る"
			title="サーバー管理アプリの更新"
			description="サーバー上で動くAPIプログラムを最新版に更新します。"
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}

			<div className="max-w-lg space-y-4">
				<Card>
					<CardHeader>
						<CardTitle className="text-sm">現在のバージョン</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">
							APIバージョン: {healthQuery.data?.version ?? "取得中..."}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-sm">APIのインストールパス</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-3">
						<label className="flex flex-col gap-1 text-sm">
							インストールパス
							<input
								value={installPathInput}
								onChange={(e) => {
									setInstallPathInput(e.target.value);
									setSaved(false);
								}}
								className="rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
								placeholder="例: /opt/server-manager-api"
							/>
						</label>
						<div className="flex items-center gap-2">
							<Button
								size="sm"
								variant="outline"
								disabled={!node || savingPath || installPathInput.trim() === (node?.apiInstallPath ?? "")}
								onClick={handleSaveInstallPath}
							>
								{savingPath ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
								保存する
							</Button>
							{saved && <span className="text-xs text-muted-foreground">保存しました</span>}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-sm">更新の実行</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-3">
						{!hasInstallPath && (
							<div className="flex items-start gap-2 rounded-md border border-input bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
								<AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
								<span>先にAPIのインストールパスを設定してください。</span>
							</div>
						)}

						<ConfirmDestructiveDialog
							trigger={
								<Button size="sm" variant="destructive" disabled={!ready || !hasInstallPath || isRunning} className="w-fit">
									{isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />}
									{isRunning ? "更新中..." : "更新する"}
								</Button>
							}
							title="APIを更新しますか?"
							description="git pull → npm install → npm run build を実行し、成功した場合はサービスを再起動します。APIが再起動され、一時的に接続できなくなります。"
							confirmLabel="更新を実行する"
							onConfirm={handleRunUpdate}
						/>

						{phase === "waiting-restart" && (
							<div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
								<Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
								<span>APIが再起動しています。しばらくお待ちください...</span>
							</div>
						)}

						{phase === "reconnected" && (
							<div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
								<CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
								<span>更新が完了し、APIに再接続できました(v{reconnectQuery.data?.version ?? healthQuery.data?.version})。</span>
							</div>
						)}

						{runError && (
							<div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
								<AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
								<span>{runError}</span>
							</div>
						)}

						{result && (
							<div className="space-y-2">
								<p className="text-sm font-medium">
									実行結果: {result.ok ? "成功" : `失敗(${result.failedStep})`}
								</p>
								<div className="space-y-2">
									{result.steps.map((step, index) => (
										<div
											key={`${step.step}-${index}`}
											className="rounded-md border border-input px-3 py-2 text-xs"
										>
											<div className="flex items-center gap-2 font-medium">
												{step.ok ? (
													<CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
												) : (
													<XCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
												)}
												{step.step}
											</div>
											{step.stdout && (
												<pre className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap break-all text-muted-foreground">
													{step.stdout}
												</pre>
											)}
											{step.stderr && (
												<pre className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap break-all text-destructive">
													{step.stderr}
												</pre>
											)}
										</div>
									))}
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</DashboardPageLayout>
	);
}
