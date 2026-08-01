import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, RotateCcw, Save, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ConfirmDestructiveDialog } from "@renderer/components/common/confirm-destructive-dialog";
import { DetailField } from "@renderer/components/common/detail-field";
import { Badge } from "@renderer/components/ui/badge";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import {
	fetchGameServerAdminDetails,
	reinstallGameServer,
	suspendGameServer,
	unsuspendGameServer,
	updateGameServerBuild,
	updateGameServerDetails,
	deleteGameServer as removeGameServer,
} from "@renderer/lib/api/game-servers/server-admin";
import { NodeApiError } from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";

const inputClassName = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";

function errorMessage(error: unknown, fallback: string): string {
	return error instanceof NodeApiError ? error.message : fallback;
}

/**
 * サーバー詳細ページの「サーバー管理」タブ。
 * Pterodactyl Application API(パネル管理者権限)を使う破壊的操作を含むため、
 * 再インストール/凍結/削除は`ConfirmDestructiveDialog`による確認を経由させる。
 */
export function AdminTab() {
	const { nodeId, identifier } = useParams<{ nodeId: string; identifier: string }>();
	const navigate = useNavigate();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();

	const ready = Boolean(node && token && identifier);
	const queryKey = ["game-server-admin", nodeId, identifier];

	const detailsQuery = useQuery({
		queryKey,
		queryFn: () => fetchGameServerAdminDetails(node!, token!, identifier!),
		enabled: ready,
		retry: 1,
	});

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [ownerId, setOwnerId] = useState("");
	const [memory, setMemory] = useState("0");
	const [swap, setSwap] = useState("0");
	const [disk, setDisk] = useState("0");
	const [io, setIo] = useState("500");
	const [cpu, setCpu] = useState("0");
	const [databases, setDatabases] = useState("0");
	const [allocations, setAllocations] = useState("0");
	const [backups, setBackups] = useState("0");

	useEffect(() => {
		const server = detailsQuery.data;
		if (!server) return;
		setName(server.name);
		setDescription(server.description ?? "");
		setOwnerId(String(server.userId));
		setMemory(String(server.limits.memory));
		setSwap(String(server.limits.swap));
		setDisk(String(server.limits.disk));
		setIo(String(server.limits.io));
		setCpu(String(server.limits.cpu));
		setDatabases(String(server.featureLimits.databases));
		setAllocations(String(server.featureLimits.allocations));
		setBackups(String(server.featureLimits.backups));
	}, [detailsQuery.data]);

	async function refresh() {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey }),
			queryClient.invalidateQueries({ queryKey: ["game-servers", nodeId] }),
		]);
	}

	const detailsMutation = useMutation({
		mutationFn: async () => {
			const trimmedOwnerId = ownerId.trim();
			await updateGameServerDetails(node!, token!, identifier!, {
				name: name.trim(),
				description,
				...(trimmedOwnerId ? { userId: Number(trimmedOwnerId) } : {}),
			});
		},
		onSuccess: refresh,
	});

	const buildMutation = useMutation({
		mutationFn: async () => {
			await updateGameServerBuild(node!, token!, identifier!, {
				memory: Number(memory),
				swap: Number(swap),
				disk: Number(disk),
				io: Number(io),
				cpu: Number(cpu),
				databases: Number(databases),
				allocations: Number(allocations),
				backups: Number(backups),
			});
		},
		onSuccess: refresh,
	});

	const reinstallMutation = useMutation({
		mutationFn: () => reinstallGameServer(node!, token!, identifier!),
		onSuccess: refresh,
	});

	const suspendMutation = useMutation({
		mutationFn: () => suspendGameServer(node!, token!, identifier!),
		onSuccess: refresh,
	});

	const unsuspendMutation = useMutation({
		mutationFn: () => unsuspendGameServer(node!, token!, identifier!),
		onSuccess: refresh,
	});

	const deleteMutation = useMutation({
		mutationFn: () => removeGameServer(node!, token!, identifier!),
		onSuccess: () => {
			navigate(`/nodes/${nodeId}/game-servers`);
		},
	});

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || detailsQuery.isLoading) statusMessage = "接続中...";
	else if (detailsQuery.isError) statusMessage = errorMessage(detailsQuery.error, "サーバー情報を取得できませんでした。");

	const server = detailsQuery.data;
	const disabled = !ready || !server;

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
			{statusMessage && <p className="text-sm text-muted-foreground">{statusMessage}</p>}

			<div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
				<Card>
					<CardHeader>
						<CardTitle className="text-sm">詳細編集</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<div className="space-y-1">
								<label className="text-xs font-medium text-muted-foreground" htmlFor="admin-server-name">
									サーバー名
								</label>
								<input
									id="admin-server-name"
									value={name}
									onChange={(e) => setName(e.target.value)}
									className={inputClassName}
									disabled={disabled}
								/>
							</div>
							<div className="space-y-1">
								<label className="text-xs font-medium text-muted-foreground" htmlFor="admin-server-owner">
									所有者ユーザーID
								</label>
								<input
									id="admin-server-owner"
									type="number"
									min={1}
									value={ownerId}
									onChange={(e) => setOwnerId(e.target.value)}
									className={`${inputClassName} font-mono`}
									disabled={disabled}
								/>
							</div>
						</div>
						<div className="space-y-1">
							<label className="text-xs font-medium text-muted-foreground" htmlFor="admin-server-description">
								説明
							</label>
							<textarea
								id="admin-server-description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								rows={2}
								className={inputClassName}
								disabled={disabled}
							/>
						</div>
						{detailsMutation.isError && (
							<p className="text-sm text-destructive">{errorMessage(detailsMutation.error, "詳細の更新に失敗しました。")}</p>
						)}
						<Button
							size="sm"
							disabled={disabled || !name.trim() || detailsMutation.isPending}
							onClick={() => detailsMutation.mutate()}
						>
							<Save className="h-4 w-4" /> {detailsMutation.isPending ? "保存中..." : "詳細を保存"}
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-sm">ビルド設定(リソース上限)</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
							<div className="space-y-1">
								<label className="text-xs font-medium text-muted-foreground" htmlFor="admin-build-memory">
									メモリ(MB・0=無制限)
								</label>
								<input
									id="admin-build-memory"
									type="number"
									min={0}
									value={memory}
									onChange={(e) => setMemory(e.target.value)}
									className={`${inputClassName} font-mono`}
									disabled={disabled}
								/>
							</div>
							<div className="space-y-1">
								<label className="text-xs font-medium text-muted-foreground" htmlFor="admin-build-swap">
									スワップ(MB・-1=無制限)
								</label>
								<input
									id="admin-build-swap"
									type="number"
									min={-1}
									value={swap}
									onChange={(e) => setSwap(e.target.value)}
									className={`${inputClassName} font-mono`}
									disabled={disabled}
								/>
							</div>
							<div className="space-y-1">
								<label className="text-xs font-medium text-muted-foreground" htmlFor="admin-build-disk">
									ディスク(MB・0=無制限)
								</label>
								<input
									id="admin-build-disk"
									type="number"
									min={0}
									value={disk}
									onChange={(e) => setDisk(e.target.value)}
									className={`${inputClassName} font-mono`}
									disabled={disabled}
								/>
							</div>
							<div className="space-y-1">
								<label className="text-xs font-medium text-muted-foreground" htmlFor="admin-build-cpu">
									CPU(%・0=無制限)
								</label>
								<input
									id="admin-build-cpu"
									type="number"
									min={0}
									value={cpu}
									onChange={(e) => setCpu(e.target.value)}
									className={`${inputClassName} font-mono`}
									disabled={disabled}
								/>
							</div>
							<div className="space-y-1">
								<label className="text-xs font-medium text-muted-foreground" htmlFor="admin-build-io">
									ブロックIO(10-1000)
								</label>
								<input
									id="admin-build-io"
									type="number"
									min={10}
									max={1000}
									value={io}
									onChange={(e) => setIo(e.target.value)}
									className={`${inputClassName} font-mono`}
									disabled={disabled}
								/>
							</div>
						</div>

						<div className="grid grid-cols-3 gap-3">
							<div className="space-y-1">
								<label className="text-xs font-medium text-muted-foreground" htmlFor="admin-build-databases">
									データベース数上限
								</label>
								<input
									id="admin-build-databases"
									type="number"
									min={0}
									value={databases}
									onChange={(e) => setDatabases(e.target.value)}
									className={`${inputClassName} font-mono`}
									disabled={disabled}
								/>
							</div>
							<div className="space-y-1">
								<label className="text-xs font-medium text-muted-foreground" htmlFor="admin-build-allocations">
									アロケーション数上限
								</label>
								<input
									id="admin-build-allocations"
									type="number"
									min={0}
									value={allocations}
									onChange={(e) => setAllocations(e.target.value)}
									className={`${inputClassName} font-mono`}
									disabled={disabled}
								/>
							</div>
							<div className="space-y-1">
								<label className="text-xs font-medium text-muted-foreground" htmlFor="admin-build-backups">
									バックアップ数上限
								</label>
								<input
									id="admin-build-backups"
									type="number"
									min={0}
									value={backups}
									onChange={(e) => setBackups(e.target.value)}
									className={`${inputClassName} font-mono`}
									disabled={disabled}
								/>
							</div>
						</div>

						{buildMutation.isError && (
							<p className="text-sm text-destructive">{errorMessage(buildMutation.error, "ビルド設定の更新に失敗しました。")}</p>
						)}
						<p className="text-xs text-muted-foreground">変更はサーバーの再起動後に反映されます。</p>
						<Button size="sm" disabled={disabled || buildMutation.isPending} onClick={() => buildMutation.mutate()}>
							<Save className="h-4 w-4" /> {buildMutation.isPending ? "保存中..." : "ビルド設定を保存"}
						</Button>
					</CardContent>
				</Card>

				<Card className="border-destructive/40">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-sm text-destructive">
							<AlertTriangle className="h-4 w-4" /> 危険な操作
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
							<div>
								<p className="text-sm font-medium">凍結状態</p>
								<p className="text-xs text-muted-foreground">
									凍結すると起動不可になり、実行中の場合は強制停止されます。
								</p>
							</div>
							<div className="flex items-center gap-2">
								{server && <Badge variant={server.suspended ? "destructive" : "success"}>{server.suspended ? "凍結中" : "稼働可能"}</Badge>}
								{server?.suspended ? (
									<Button
										size="sm"
										variant="outline"
										disabled={disabled || unsuspendMutation.isPending}
										onClick={() => unsuspendMutation.mutate()}
									>
										<ShieldCheck className="h-4 w-4" /> {unsuspendMutation.isPending ? "解除中..." : "凍結解除"}
									</Button>
								) : (
									<ConfirmDestructiveDialog
										trigger={
											<Button size="sm" variant="destructive" disabled={disabled || suspendMutation.isPending}>
												<ShieldAlert className="h-4 w-4" /> 凍結する
											</Button>
										}
										title={`${server?.name ?? "このサーバー"} を凍結しますか?`}
										description="凍結すると強制的に停止され、凍結解除するまで起動できなくなります。"
										confirmLabel="凍結する"
										onConfirm={() => suspendMutation.mutateAsync()}
									/>
								)}
							</div>
						</div>
						{(suspendMutation.isError || unsuspendMutation.isError) && (
							<p className="text-sm text-destructive">
								{errorMessage(suspendMutation.error ?? unsuspendMutation.error, "凍結状態の変更に失敗しました。")}
							</p>
						)}

						<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
							<div>
								<p className="text-sm font-medium">再インストール</p>
								<p className="text-xs text-muted-foreground">
									Eggの設定に基づいてサーバーを再構築します。ワールドデータ等のファイルが初期化される可能性があります。
								</p>
							</div>
							<ConfirmDestructiveDialog
								trigger={
									<Button size="sm" variant="destructive" disabled={disabled || reinstallMutation.isPending}>
										<RotateCcw className="h-4 w-4" /> 再インストール
									</Button>
								}
								title={`${server?.name ?? "このサーバー"} を再インストールしますか?`}
								description="サーバーのファイルが初期化される可能性があります。この操作は取り消せません。実行前に必要なデータのバックアップを取得してください。"
								confirmLabel="再インストールする"
								onConfirm={() => reinstallMutation.mutateAsync()}
							/>
						</div>
						{reinstallMutation.isError && (
							<p className="text-sm text-destructive">{errorMessage(reinstallMutation.error, "再インストールに失敗しました。")}</p>
						)}

						<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/50 bg-destructive/5 p-3">
							<div>
								<p className="text-sm font-medium">サーバーの削除</p>
								<p className="text-xs text-muted-foreground">
									サーバー・ファイル・データベース・バックアップを含む全データが完全に削除されます。
								</p>
							</div>
							<ConfirmDestructiveDialog
								trigger={
									<Button size="sm" variant="destructive" disabled={disabled || deleteMutation.isPending}>
										<Trash2 className="h-4 w-4" /> サーバーを削除
									</Button>
								}
								title={`${server?.name ?? "このサーバー"} を削除しますか?`}
								description="この操作は取り消せません。サーバーに含まれるすべてのファイル・データベース・バックアップが完全に失われます。"
								confirmLabel="完全に削除する"
								onConfirm={() => deleteMutation.mutateAsync()}
							/>
						</div>
						{deleteMutation.isError && (
							<p className="text-sm text-destructive">{errorMessage(deleteMutation.error, "サーバーの削除に失敗しました。")}</p>
						)}

						<DetailField
							label="内部ID / UUID"
							value={
								server ? (
									<span className="break-all font-mono text-xs">
										#{server.id} / {server.uuid}
									</span>
								) : (
									"取得中..."
								)
							}
						/>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
