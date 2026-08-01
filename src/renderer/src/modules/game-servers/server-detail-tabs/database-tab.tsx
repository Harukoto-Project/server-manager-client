import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Database, Eye, EyeOff, KeyRound, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { ConfirmDestructiveDialog } from "@renderer/components/common/confirm-destructive-dialog";
import { EntityList } from "@renderer/components/common/entity-list";
import { Button } from "@renderer/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@renderer/components/ui/dialog";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import {
	type GameServerDatabase,
	createGameServerDatabase,
	deleteGameServerDatabase,
	fetchGameServerDatabases,
	rotateGameServerDatabasePassword,
} from "@renderer/lib/api/game-servers/databases";
import { NodeApiError } from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";

const inputClassName = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";

/** データベースタブ。`/game-servers/databases/:identifier`のAPIを利用してサーバー専用DBを管理する */
export function DatabaseTab() {
	const { nodeId, identifier } = useParams<{ nodeId: string; identifier: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();
	const [actionError, setActionError] = useState<string | null>(null);

	const ready = Boolean(node && token && identifier);
	const queryKey = ["game-server-databases", nodeId, identifier];

	const databasesQuery = useQuery({
		queryKey,
		queryFn: () => fetchGameServerDatabases(node!, token!, identifier!),
		enabled: ready,
		retry: 1,
	});

	async function refresh() {
		await queryClient.invalidateQueries({ queryKey });
	}

	const createMutation = useMutation({
		mutationFn: (input: { database: string; remote: string }) =>
			createGameServerDatabase(node!, token!, identifier!, input.database, input.remote),
		onSuccess: refresh,
	});

	const rotateMutation = useMutation({
		mutationFn: (databaseId: string) => rotateGameServerDatabasePassword(node!, token!, identifier!, databaseId),
		onSuccess: refresh,
		onError: (error) => {
			setActionError(error instanceof NodeApiError ? error.message : "パスワードの再発行に失敗しました。");
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (databaseId: string) => deleteGameServerDatabase(node!, token!, identifier!, databaseId),
		onSuccess: refresh,
		onError: (error) => {
			setActionError(error instanceof NodeApiError ? error.message : "データベースの削除に失敗しました。");
		},
	});

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || databasesQuery.isLoading) statusMessage = "接続中...";
	else if (databasesQuery.isError) {
		statusMessage =
			databasesQuery.error instanceof NodeApiError ? databasesQuery.error.message : "データベース情報の取得に失敗しました。";
	}

	const databases = databasesQuery.data ?? [];

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-sm font-medium">データベース</p>
					<p className="text-xs text-muted-foreground">このサーバー専用のMySQL/MariaDBデータベースを管理します。</p>
				</div>
				<CreateDatabaseDialog
					trigger={
						<Button size="sm" disabled={!ready}>
							<Plus className="h-4 w-4" /> データベースを作成
						</Button>
					}
					pending={createMutation.isPending}
					onCreate={(database, remote) => createMutation.mutateAsync({ database, remote })}
				/>
			</div>

			{statusMessage && <p className="text-sm text-muted-foreground">{statusMessage}</p>}
			{actionError && <p className="text-sm text-destructive">{actionError}</p>}

			{!statusMessage && databases.length === 0 && (
				<p className="text-sm text-muted-foreground">データベースはまだ作成されていません。</p>
			)}

			{databases.length > 0 && (
				<div className="min-h-0 flex-1 overflow-y-auto">
					<EntityList>
						{databases.map((database) => (
							<DatabaseRow
								key={database.id}
								database={database}
								onRotate={async () => {
									await rotateMutation.mutateAsync(database.id);
								}}
								onDelete={async () => {
									await deleteMutation.mutateAsync(database.id);
								}}
								rotatePending={rotateMutation.isPending && rotateMutation.variables === database.id}
							/>
						))}
					</EntityList>
				</div>
			)}
		</div>
	);
}

interface DatabaseRowProps {
	database: GameServerDatabase;
	onRotate: () => Promise<void>;
	onDelete: () => Promise<void>;
	rotatePending: boolean;
}

function DatabaseRow({ database, onRotate, onDelete, rotatePending }: DatabaseRowProps) {
	const [showPassword, setShowPassword] = useState(false);

	async function handleRotate() {
		setShowPassword(false);
		await onRotate();
	}

	return (
		<div className="flex flex-col gap-2 px-4 py-3">
			<div className="flex items-center gap-3">
				<Database className="h-4 w-4 shrink-0 text-muted-foreground" />
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-medium">{database.name}</p>
					<p className="truncate text-xs text-muted-foreground">
						{database.host.address}:{database.host.port}
					</p>
				</div>
				<div className="flex shrink-0 items-center gap-1">
					<ConfirmDestructiveDialog
						trigger={
							<Button size="icon" variant="ghost" className="h-8 w-8" title="パスワードを再発行" disabled={rotatePending}>
								<KeyRound className="h-4 w-4" />
							</Button>
						}
						title="パスワードを再発行しますか?"
						description="現在のパスワードは即座に無効化されます。このデータベースに接続しているアプリケーションの設定も併せて更新してください。"
						confirmLabel="再発行する"
						onConfirm={handleRotate}
					/>
					<ConfirmDestructiveDialog
						trigger={
							<Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive">
								<Trash2 className="h-4 w-4" />
							</Button>
						}
						title={`データベース「${database.name}」を削除しますか?`}
						description="このデータベース内の全てのデータが失われます。この操作は取り消せません。"
						confirmLabel="削除する"
						onConfirm={onDelete}
					/>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-3 rounded-md bg-muted/40 p-3 text-xs sm:grid-cols-4">
				<div>
					<p className="text-muted-foreground">ユーザー名</p>
					<p className="font-mono">{database.username}</p>
				</div>
				<div>
					<p className="text-muted-foreground">パスワード</p>
					{database.password ? (
						<div className="flex items-center gap-1">
							<span className="font-mono break-all">{showPassword ? database.password : "••••••••"}</span>
							<Button
								size="icon"
								variant="ghost"
								className="h-5 w-5"
								onClick={() => setShowPassword((v) => !v)}
								title={showPassword ? "隠す" : "表示する"}
							>
								{showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
							</Button>
						</div>
					) : (
						<p className="font-mono text-muted-foreground">再発行すると表示されます</p>
					)}
				</div>
				<div>
					<p className="text-muted-foreground">接続許可元</p>
					<p className="font-mono">{database.connectionsFrom}</p>
				</div>
				<div>
					<p className="text-muted-foreground">最大接続数</p>
					<p className="font-mono">{database.maxConnections > 0 ? database.maxConnections : "無制限"}</p>
				</div>
			</div>
		</div>
	);
}

interface CreateDatabaseDialogProps {
	trigger: React.ReactNode;
	pending: boolean;
	onCreate: (database: string, remote: string) => Promise<unknown>;
}

function CreateDatabaseDialog({ trigger, pending, onCreate }: CreateDatabaseDialogProps) {
	const [open, setOpen] = useState(false);
	const [database, setDatabase] = useState("");
	const [remote, setRemote] = useState("%");
	const [error, setError] = useState<string | null>(null);

	function handleOpenChange(next: boolean) {
		if (next) {
			setDatabase("");
			setRemote("%");
			setError(null);
		}
		setOpen(next);
	}

	async function handleSubmit() {
		if (!database.trim()) {
			setError("データベース名を入力してください。");
			return;
		}
		setError(null);
		try {
			await onCreate(database.trim(), remote.trim() || "%");
			setOpen(false);
		} catch (err) {
			setError(err instanceof NodeApiError ? err.message : "データベースの作成に失敗しました。");
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>データベースを作成</DialogTitle>
					<DialogDescription>
						サーバー専用のMySQL/MariaDBデータベースを新規作成します。データベース名にはサーバー識別子のプレフィックスが自動的に付与されます。
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="db-name">
							データベース名
						</label>
						<input
							id="db-name"
							autoFocus
							value={database}
							onChange={(e) => setDatabase(e.target.value)}
							placeholder="minecraft"
							className={`${inputClassName} font-mono`}
						/>
					</div>
					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="db-remote">
							接続許可元(通常は"%"のまま)
						</label>
						<input
							id="db-remote"
							value={remote}
							onChange={(e) => setRemote(e.target.value)}
							placeholder="%"
							className={`${inputClassName} font-mono`}
						/>
					</div>
					{error && <p className="text-sm text-destructive">{error}</p>}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)}>
						キャンセル
					</Button>
					<Button disabled={pending} onClick={handleSubmit}>
						{pending ? "作成中..." : "作成する"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
