import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ConfirmDestructiveDialog } from "@renderer/components/common/confirm-destructive-dialog";
import { DetailField } from "@renderer/components/common/detail-field";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import { fetchLocaleInfo, updateLocale } from "@renderer/lib/api/system-settings/basics";
import { NodeApiError } from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";

const inputClassName = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";

export function LanguageRegionPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();
	const ready = Boolean(node && token);

	const [selectedLocale, setSelectedLocale] = useState("");
	const [pending, setPending] = useState(false);
	const [actionError, setActionError] = useState<string | null>(null);
	const [resultMessage, setResultMessage] = useState<string | null>(null);

	const localeQuery = useQuery({
		queryKey: ["system-settings-locale", nodeId],
		queryFn: () => fetchLocaleInfo(node!, token!),
		enabled: ready,
		retry: 1,
	});

	useEffect(() => {
		if (localeQuery.data?.currentLang) setSelectedLocale(localeQuery.data.currentLang);
	}, [localeQuery.data?.currentLang]);

	async function handleConfirm() {
		if (!node || !token || !selectedLocale) return;
		setActionError(null);
		setResultMessage(null);
		setPending(true);
		try {
			const result = await updateLocale(node, token, selectedLocale);
			setResultMessage(result.message);
			await queryClient.invalidateQueries({ queryKey: ["system-settings-locale", nodeId] });
		} catch (error) {
			setActionError(error instanceof NodeApiError ? error.message : "言語設定の変更に失敗しました。");
		} finally {
			setPending(false);
		}
	}

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || localeQuery.isLoading) statusMessage = "接続中...";
	else if (localeQuery.isError)
		statusMessage = localeQuery.error instanceof NodeApiError ? localeQuery.error.message : "ノードに接続できませんでした。";

	const currentLang = localeQuery.data?.currentLang ?? "";
	const changed = selectedLocale.length > 0 && selectedLocale !== currentLang;

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/system-settings`}
			backLabel="設定一覧に戻る"
			title="言語と地域"
			description="システムで使う言語や地域(表示形式)の設定を行います。"
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}
			{actionError && <p className="mb-4 text-sm text-destructive">{actionError}</p>}
			{resultMessage && <p className="mb-4 text-sm text-muted-foreground">{resultMessage}</p>}

			<div className="max-w-lg space-y-4">
				<DetailField label="現在の言語設定(LANG)" value={currentLang || "取得中..."} />

				<Card>
					<CardHeader>
						<CardTitle className="text-sm">言語設定を変更</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="space-y-1">
							<label className="text-xs font-medium text-muted-foreground" htmlFor="locale-select">
								ロケール
							</label>
							<select
								id="locale-select"
								value={selectedLocale}
								onChange={(e) => setSelectedLocale(e.target.value)}
								className={inputClassName}
								disabled={!ready || localeQuery.isLoading}
							>
								{selectedLocale && !localeQuery.data?.locales.includes(selectedLocale) && (
									<option value={selectedLocale}>{selectedLocale}</option>
								)}
								{(localeQuery.data?.locales ?? []).map((locale) => (
									<option key={locale} value={locale}>
										{locale}
									</option>
								))}
							</select>
						</div>

						<ConfirmDestructiveDialog
							trigger={
								<Button size="sm" variant="destructive" disabled={!ready || !changed || pending}>
									<Globe className="h-4 w-4" /> {pending ? "変更中..." : "言語設定を変更する"}
								</Button>
							}
							title={`言語設定を「${selectedLocale}」に変更しますか?`}
							description="変更を完全に反映するには、サーバーへの再ログインまたは再起動が必要になる場合があります。"
							confirmLabel="変更する"
							onConfirm={handleConfirm}
						/>
					</CardContent>
				</Card>
			</div>
		</DashboardPageLayout>
	);
}
