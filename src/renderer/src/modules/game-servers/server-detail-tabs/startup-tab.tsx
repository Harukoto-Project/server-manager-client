import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { Badge } from "@renderer/components/ui/badge";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import {
	type GameServerStartupVariable,
	fetchGameServerStartup,
	updateGameServerStartupVariable,
} from "@renderer/lib/api/game-servers/startup";
import { NodeApiError } from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";

const inputClassName = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";

/** 起動設定タブ。`/game-servers/startup/:identifier`のAPIを利用してスタートアップコマンド・Egg変数を管理する */
export function StartupTab() {
	const { nodeId, identifier } = useParams<{ nodeId: string; identifier: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();
	const [actionError, setActionError] = useState<string | null>(null);

	const ready = Boolean(node && token && identifier);
	const queryKey = ["game-server-startup", nodeId, identifier];

	const startupQuery = useQuery({
		queryKey,
		queryFn: () => fetchGameServerStartup(node!, token!, identifier!),
		enabled: ready,
		retry: 1,
	});

	const updateMutation = useMutation({
		mutationFn: (input: { key: string; value: string }) =>
			updateGameServerStartupVariable(node!, token!, identifier!, input.key, input.value),
		onSuccess: () => {
			setActionError(null);
			return queryClient.invalidateQueries({ queryKey });
		},
		onError: (error) => {
			setActionError(error instanceof NodeApiError ? error.message : "環境変数の更新に失敗しました。");
		},
	});

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || startupQuery.isLoading) statusMessage = "接続中...";
	else if (startupQuery.isError) {
		statusMessage =
			startupQuery.error instanceof NodeApiError ? startupQuery.error.message : "起動設定の取得に失敗しました。";
	}

	const startup = startupQuery.data;

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
			<div>
				<p className="text-sm font-medium">起動設定</p>
				<p className="text-xs text-muted-foreground">
					スタートアップコマンド・Dockerイメージ・環境変数(Egg変数)を確認できます。変数の変更は多くの場合サーバーの再起動後に反映されます。
				</p>
			</div>

			{statusMessage && <p className="text-sm text-muted-foreground">{statusMessage}</p>}
			{actionError && <p className="text-sm text-destructive">{actionError}</p>}

			{startup && (
				<div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">スタートアップコマンド</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-muted/40 p-3 font-mono text-xs">
								{startup.startupCommand || "(取得できませんでした)"}
							</pre>
							<div className="flex items-center gap-2 text-xs text-muted-foreground">
								<span>Dockerイメージ:</span>
								<span className="font-mono">{startup.dockerImage || "不明(権限が無いか取得できませんでした)"}</span>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-sm">環境変数(Egg変数)</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							{startup.variables.length === 0 && (
								<p className="text-sm text-muted-foreground">環境変数はありません。</p>
							)}
							{startup.variables.map((variable) => (
								<VariableRow
									key={variable.envVariable}
									variable={variable}
									pending={updateMutation.isPending && updateMutation.variables?.key === variable.envVariable}
									onSave={(value) => updateMutation.mutateAsync({ key: variable.envVariable, value })}
								/>
							))}
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	);
}

interface VariableRowProps {
	variable: GameServerStartupVariable;
	pending: boolean;
	onSave: (value: string) => Promise<unknown>;
}

function VariableRow({ variable, pending, onSave }: VariableRowProps) {
	const [value, setValue] = useState(variable.serverValue);
	const [error, setError] = useState<string | null>(null);
	const dirty = value !== variable.serverValue;

	async function handleSave() {
		setError(null);
		try {
			await onSave(value);
		} catch (err) {
			setError(err instanceof NodeApiError ? err.message : "更新に失敗しました。");
		}
	}

	return (
		<div className="space-y-1.5 rounded-md border p-3">
			<div className="flex items-center justify-between gap-2">
				<div className="min-w-0">
					<p className="truncate text-sm font-medium">{variable.name}</p>
					<p className="truncate text-xs text-muted-foreground">{variable.envVariable}</p>
				</div>
				{!variable.isEditable && (
					<Badge variant="outline" className="shrink-0">
						編集不可
					</Badge>
				)}
			</div>
			{variable.description && <p className="text-xs text-muted-foreground">{variable.description}</p>}
			<div className="flex items-center gap-2">
				<input
					value={value}
					onChange={(e) => setValue(e.target.value)}
					disabled={!variable.isEditable || pending}
					className={`${inputClassName} font-mono disabled:opacity-60`}
				/>
				<Button size="sm" disabled={!variable.isEditable || !dirty || pending} onClick={handleSave}>
					{pending ? "保存中..." : "保存"}
				</Button>
			</div>
			{error && <p className="text-xs text-destructive">{error}</p>}
		</div>
	);
}
