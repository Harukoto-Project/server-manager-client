import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Layers, Loader2, Package, Trash2, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ConfirmDestructiveDialog } from "@renderer/components/common/confirm-destructive-dialog";
import { EntityList, EntityListItem } from "@renderer/components/common/entity-list";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Badge } from "@renderer/components/ui/badge";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import {
	type GameServerEggVariable,
	deleteEgg,
	exportEgg,
	fetchEggs,
	fetchNests,
	importEgg,
	updateEggVariable,
} from "@renderer/lib/api/game-servers/nests-eggs";
import { NodeApiError } from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";

const inputClassName = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";

/**
 * Egg・Nestライブラリ管理ページ。
 * Nest一覧→選択したNestのEgg一覧→Egg詳細(説明・起動コマンド・Dockerイメージ・変数一覧)を表示し、
 * Eggのエクスポート(JSONダウンロード)・インポート(ファイルアップロード)・削除を行う。
 */
export function EggNestPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();
	const ready = Boolean(node && token);

	const [selectedNestId, setSelectedNestId] = useState<number | null>(null);
	const [selectedEggId, setSelectedEggId] = useState<number | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);

	const nestsQuery = useQuery({
		queryKey: ["nests-eggs-nests", nodeId],
		queryFn: () => fetchNests(node!, token!),
		enabled: ready,
	});

	const eggsQueryKey = ["nests-eggs-eggs", nodeId, selectedNestId];
	const eggsQuery = useQuery({
		queryKey: eggsQueryKey,
		queryFn: () => fetchEggs(node!, token!, selectedNestId!),
		enabled: ready && selectedNestId !== null,
	});

	const selectedEgg = useMemo(
		() => eggsQuery.data?.find((egg) => egg.id === selectedEggId),
		[eggsQuery.data, selectedEggId],
	);

	function selectNest(id: number) {
		setSelectedNestId(id);
		setSelectedEggId(null);
		setActionError(null);
	}

	const importMutation = useMutation({
		mutationFn: (eggJson: string) => importEgg(node!, token!, selectedNestId!, eggJson),
		onSuccess: async (egg) => {
			await queryClient.invalidateQueries({ queryKey: eggsQueryKey });
			setSelectedEggId(egg.id);
		},
		onError: (error) => {
			setActionError(error instanceof NodeApiError ? error.message : "Eggのインポートに失敗しました。");
		},
	});

	const deleteMutation = useMutation({
		mutationFn: () => deleteEgg(node!, token!, selectedNestId!, selectedEggId!),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: eggsQueryKey });
			setSelectedEggId(null);
		},
		onError: (error) => {
			setActionError(error instanceof NodeApiError ? error.message : "Eggの削除に失敗しました。");
		},
	});

	const exportMutation = useMutation({
		mutationFn: () => exportEgg(node!, token!, selectedNestId!, selectedEggId!),
		onSuccess: (eggJson) => {
			if (!selectedEgg) return;
			downloadJson(`egg-${selectedEgg.name.toLowerCase().replace(/\s+/g, "-")}.json`, eggJson);
		},
		onError: (error) => {
			setActionError(error instanceof NodeApiError ? error.message : "Eggのエクスポートに失敗しました。");
		},
	});

	const updateVariableMutation = useMutation({
		mutationFn: (input: { variableId: number; defaultValue: string }) =>
			updateEggVariable(node!, token!, selectedNestId!, selectedEggId!, input.variableId, input.defaultValue),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: eggsQueryKey });
		},
		onError: (error) => {
			setActionError(error instanceof NodeApiError ? error.message : "変数の更新に失敗しました。");
		},
	});

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading) statusMessage = "接続中...";

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/game-servers/admin`}
			backLabel="管理者機能一覧に戻る"
			title="Egg・Nestライブラリ管理"
			description="サーバーの雛形(Egg)と分類(Nest)の閲覧・変数管理・インポート/エクスポート/削除を行います。"
			actions={
				<ImportEggDialog
					disabled={!selectedNestId}
					pending={importMutation.isPending}
					onImport={(eggJson) => importMutation.mutateAsync(eggJson)}
				/>
			}
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}
			{actionError && <p className="mb-4 text-sm text-destructive">{actionError}</p>}

			<div className="flex flex-col gap-6 lg:flex-row">
				<div className="w-full shrink-0 lg:w-64">
					<p className="mb-2 text-xs font-medium text-muted-foreground">Nest</p>
					{nestsQuery.isLoading && <p className="text-sm text-muted-foreground">読み込み中...</p>}
					{nestsQuery.isError && <p className="text-sm text-destructive">Nest一覧の取得に失敗しました。</p>}
					{nestsQuery.data && (
						<EntityList>
							{nestsQuery.data.map((nest) => (
								<EntityListItem
									key={nest.id}
									icon={Layers}
									title={nest.name}
									subtitle={nest.description ?? undefined}
									onClick={() => selectNest(nest.id)}
									badge={selectedNestId === nest.id ? <Badge variant="secondary">選択中</Badge> : undefined}
								/>
							))}
						</EntityList>
					)}
				</div>

				<div className="w-full shrink-0 lg:w-72">
					<p className="mb-2 text-xs font-medium text-muted-foreground">Egg</p>
					{selectedNestId === null && <p className="text-sm text-muted-foreground">先にNestを選択してください。</p>}
					{eggsQuery.isLoading && <p className="text-sm text-muted-foreground">読み込み中...</p>}
					{eggsQuery.isError && <p className="text-sm text-destructive">Egg一覧の取得に失敗しました。</p>}
					{eggsQuery.data && (
						<EntityList>
							{eggsQuery.data.map((egg) => (
								<EntityListItem
									key={egg.id}
									icon={Package}
									title={egg.name}
									subtitle={egg.dockerImage}
									onClick={() => setSelectedEggId(egg.id)}
									badge={selectedEggId === egg.id ? <Badge variant="secondary">選択中</Badge> : undefined}
								/>
							))}
							{eggsQuery.data.length === 0 && (
								<p className="p-4 text-sm text-muted-foreground">このNestにはEggがありません。</p>
							)}
						</EntityList>
					)}
				</div>

				<div className="min-w-0 flex-1">
					{!selectedEgg && (
						<Card>
							<CardContent className="flex flex-col items-center gap-2 py-16 text-center">
								<Package className="h-8 w-8 text-muted-foreground" />
								<p className="text-sm text-muted-foreground">左の一覧からEggを選択してください。</p>
							</CardContent>
						</Card>
					)}

					{selectedEgg && (
						<div className="flex flex-col gap-4">
							<Card>
								<CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
									<div>
										<CardTitle className="text-base">{selectedEgg.name}</CardTitle>
										<CardDescription>{selectedEgg.description || "説明はありません。"}</CardDescription>
									</div>
									<div className="flex shrink-0 items-center gap-2">
										<Button
											size="sm"
											variant="outline"
											disabled={exportMutation.isPending}
											onClick={() => exportMutation.mutate()}
										>
											{exportMutation.isPending ? (
												<Loader2 className="h-4 w-4 animate-spin" />
											) : (
												<Download className="h-4 w-4" />
											)}
											エクスポート
										</Button>
										<ConfirmDestructiveDialog
											trigger={
												<Button size="sm" variant="destructive" disabled={deleteMutation.isPending}>
													<Trash2 className="h-4 w-4" /> 削除
												</Button>
											}
											title={`Egg「${selectedEgg.name}」を削除しますか?`}
											description="このEggを使用しているサーバーがある場合、削除できないか、起動できなくなる可能性があります。この操作は取り消せません。"
											confirmLabel="削除する"
											onConfirm={() => deleteMutation.mutateAsync()}
										/>
									</div>
								</CardHeader>
								<CardContent className="space-y-3 text-sm">
									<div>
										<p className="text-xs font-medium text-muted-foreground">Dockerイメージ</p>
										<p className="font-mono text-xs">{selectedEgg.dockerImage}</p>
									</div>
									<div>
										<p className="text-xs font-medium text-muted-foreground">起動コマンド</p>
										<p className="whitespace-pre-wrap break-all font-mono text-xs">{selectedEgg.startup}</p>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle className="text-base">環境変数</CardTitle>
									<CardDescription>デフォルト値を編集して保存できます(編集可能な変数のみ)。</CardDescription>
								</CardHeader>
								<CardContent className="space-y-3">
									{selectedEgg.variables.length === 0 && (
										<p className="text-sm text-muted-foreground">変数はありません。</p>
									)}
									{selectedEgg.variables.map((variable) => (
										<EggVariableRow
											key={variable.id}
											variable={variable}
											onSave={(value) =>
												updateVariableMutation.mutateAsync({ variableId: variable.id, defaultValue: value })
											}
										/>
									))}
								</CardContent>
							</Card>
						</div>
					)}
				</div>
			</div>
		</DashboardPageLayout>
	);
}

function EggVariableRow({
	variable,
	onSave,
}: {
	variable: GameServerEggVariable;
	onSave: (value: string) => Promise<unknown>;
}) {
	const [value, setValue] = useState(variable.defaultValue);
	const [pending, setPending] = useState(false);
	const dirty = value !== variable.defaultValue;

	async function handleSave() {
		setPending(true);
		try {
			await onSave(value);
		} finally {
			setPending(false);
		}
	}

	return (
		<div className="space-y-1 rounded-md border bg-card p-3">
			<div className="flex items-center justify-between gap-2">
				<label className="text-xs font-medium text-muted-foreground">
					{variable.name}({variable.envVariable}){!variable.isEditable && " - 編集不可"}
				</label>
				{dirty && variable.isEditable && (
					<Button size="sm" variant="outline" disabled={pending} onClick={handleSave}>
						{pending ? "保存中..." : "保存"}
					</Button>
				)}
			</div>
			<input
				value={value}
				onChange={(e) => setValue(e.target.value)}
				disabled={!variable.isEditable}
				className={`${inputClassName} font-mono`}
			/>
			{variable.description && <p className="text-xs text-muted-foreground">{variable.description}</p>}
			<p className="text-xs text-muted-foreground">ルール: {variable.rules}</p>
		</div>
	);
}

function ImportEggDialog({
	disabled,
	pending,
	onImport,
}: {
	disabled: boolean;
	pending: boolean;
	onImport: (eggJson: string) => Promise<unknown>;
}) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [error, setError] = useState<string | null>(null);

	async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;
		setError(null);
		try {
			const content = await file.text();
			await onImport(content);
		} catch (err) {
			setError(err instanceof NodeApiError ? err.message : "Eggのインポートに失敗しました。");
		}
	}

	return (
		<div className="flex flex-col items-end gap-1">
			<Button
				size="sm"
				variant="outline"
				disabled={disabled || pending}
				title={disabled ? "先にNestを選択してください" : undefined}
				onClick={() => fileInputRef.current?.click()}
			>
				{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
				Eggをインポート
			</Button>
			<input ref={fileInputRef} type="file" accept="application/json,.json" hidden onChange={handleFileChange} />
			{error && <p className="text-xs text-destructive">{error}</p>}
		</div>
	);
}

function downloadJson(filename: string, content: string) {
	const blob = new Blob([content], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	anchor.click();
	URL.revokeObjectURL(url);
}
