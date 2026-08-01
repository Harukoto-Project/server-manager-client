import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Download, Lock, Plus, RotateCcw, Trash2, Unlock } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { ConfirmDestructiveDialog } from "@renderer/components/common/confirm-destructive-dialog";
import { EntityList } from "@renderer/components/common/entity-list";
import { Badge } from "@renderer/components/ui/badge";
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
	type GameServerBackup,
	createGameServerBackup,
	deleteGameServerBackup,
	fetchGameServerBackupDownloadUrl,
	fetchGameServerBackups,
	restoreGameServerBackup,
	toggleGameServerBackupLock,
} from "@renderer/lib/api/game-servers/backups";
import { NodeApiError } from "@renderer/lib/node-api-client";
import { formatBytes } from "@renderer/lib/utils";
import { useNodesStore } from "@renderer/state/nodes-store";

const inputClassName = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";
const textareaClassName =
	"w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-1.5 font-mono text-xs";

/** バックアップタブ。`/game-servers/backups/:identifier`のAPIを利用してバックアップを管理する */
export function BackupsTab() {
	const { nodeId, identifier } = useParams<{ nodeId: string; identifier: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();
	const [actionError, setActionError] = useState<string | null>(null);

	const ready = Boolean(node && token && identifier);
	const queryKey = ["game-server-backups", nodeId, identifier];

	const backupsQuery = useQuery({
		queryKey,
		queryFn: () => fetchGameServerBackups(node!, token!, identifier!),
		enabled: ready,
		refetchInterval: 15000,
		retry: 1,
	});

	async function refresh() {
		await queryClient.invalidateQueries({ queryKey });
	}

	function reportError(error: unknown, fallback: string) {
		setActionError(error instanceof NodeApiError ? error.message : fallback);
	}

	const createMutation = useMutation({
		mutationFn: (input: { name: string; ignoredFiles: string }) =>
			createGameServerBackup(node!, token!, identifier!, input.name, input.ignoredFiles),
		onSuccess: refresh,
	});

	const downloadMutation = useMutation({
		mutationFn: (backupUuid: string) => fetchGameServerBackupDownloadUrl(node!, token!, identifier!, backupUuid),
		onSuccess: (url) => {
			window.open(url, "_blank", "noopener,noreferrer");
		},
		onError: (error) => reportError(error, "ダウンロードURLの取得に失敗しました。"),
	});

	const restoreMutation = useMutation({
		mutationFn: (backupUuid: string) => restoreGameServerBackup(node!, token!, identifier!, backupUuid, true),
		onSuccess: refresh,
		onError: (error) => reportError(error, "復元の開始に失敗しました。"),
	});

	const lockMutation = useMutation({
		mutationFn: (backupUuid: string) => toggleGameServerBackupLock(node!, token!, identifier!, backupUuid),
		onSuccess: refresh,
		onError: (error) => reportError(error, "ロック状態の変更に失敗しました。"),
	});

	const deleteMutation = useMutation({
		mutationFn: (backupUuid: string) => deleteGameServerBackup(node!, token!, identifier!, backupUuid),
		onSuccess: refresh,
		onError: (error) => reportError(error, "バックアップの削除に失敗しました。"),
	});

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || backupsQuery.isLoading) statusMessage = "接続中...";
	else if (backupsQuery.isError) {
		statusMessage =
			backupsQuery.error instanceof NodeApiError ? backupsQuery.error.message : "バックアップ情報の取得に失敗しました。";
	}

	const backups = [...(backupsQuery.data ?? [])].sort(
		(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
	);

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-sm font-medium">バックアップ</p>
					<p className="text-xs text-muted-foreground">サーバーのバックアップを作成・管理します。</p>
				</div>
				<CreateBackupDialog
					trigger={
						<Button size="sm" disabled={!ready}>
							<Plus className="h-4 w-4" /> バックアップを作成
						</Button>
					}
					pending={createMutation.isPending}
					onCreate={(name, ignoredFiles) => createMutation.mutateAsync({ name, ignoredFiles })}
				/>
			</div>

			{statusMessage && <p className="text-sm text-muted-foreground">{statusMessage}</p>}
			{actionError && <p className="text-sm text-destructive">{actionError}</p>}

			{!statusMessage && backups.length === 0 && (
				<p className="text-sm text-muted-foreground">バックアップはまだ作成されていません。</p>
			)}

			{backups.length > 0 && (
				<div className="min-h-0 flex-1 overflow-y-auto">
					<EntityList>
						{backups.map((backup) => (
							<BackupRow
								key={backup.uuid}
								backup={backup}
								onDownload={async () => {
									await downloadMutation.mutateAsync(backup.uuid);
								}}
								downloadPending={downloadMutation.isPending && downloadMutation.variables === backup.uuid}
								onRestore={async () => {
									await restoreMutation.mutateAsync(backup.uuid);
								}}
								restorePending={restoreMutation.isPending && restoreMutation.variables === backup.uuid}
								onToggleLock={async () => {
									await lockMutation.mutateAsync(backup.uuid);
								}}
								lockPending={lockMutation.isPending && lockMutation.variables === backup.uuid}
								onDelete={async () => {
									await deleteMutation.mutateAsync(backup.uuid);
								}}
							/>
						))}
					</EntityList>
				</div>
			)}
		</div>
	);
}

interface BackupRowProps {
	backup: GameServerBackup;
	onDownload: () => Promise<void>;
	downloadPending: boolean;
	onRestore: () => Promise<void>;
	restorePending: boolean;
	onToggleLock: () => Promise<void>;
	lockPending: boolean;
	onDelete: () => Promise<void>;
}

function BackupRow({
	backup,
	onDownload,
	downloadPending,
	onRestore,
	restorePending,
	onToggleLock,
	lockPending,
	onDelete,
}: BackupRowProps) {
	const inProgress = backup.completedAt === null;
	const failed = !inProgress && !backup.isSuccessful;

	return (
		<div className="flex flex-col gap-2 px-4 py-3">
			<div className="flex items-center gap-3">
				<Archive className="h-4 w-4 shrink-0 text-muted-foreground" />
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-medium">{backup.name}</p>
					<p className="truncate text-xs text-muted-foreground">
						{new Date(backup.createdAt).toLocaleString("ja-JP")} ・ {formatBytes(backup.bytes)}
					</p>
				</div>
				<div className="hidden shrink-0 items-center gap-1.5 sm:flex">
					{inProgress && <Badge variant="secondary">作成中...</Badge>}
					{failed && <Badge variant="destructive">失敗</Badge>}
					{!inProgress && backup.isSuccessful && <Badge variant="success">完了</Badge>}
					{backup.isLocked && (
						<Badge variant="outline">
							<Lock className="mr-1 h-3 w-3" />
							ロック中
						</Badge>
					)}
				</div>
				<div className="flex shrink-0 items-center gap-1">
					<Button
						size="icon"
						variant="ghost"
						className="h-8 w-8"
						title="ダウンロード"
						disabled={!backup.isSuccessful || downloadPending}
						onClick={onDownload}
					>
						<Download className="h-4 w-4" />
					</Button>
					<ConfirmDestructiveDialog
						trigger={
							<Button
								size="icon"
								variant="ghost"
								className="h-8 w-8"
								title="このバックアップから復元"
								disabled={!backup.isSuccessful || restorePending}
							>
								<RotateCcw className="h-4 w-4" />
							</Button>
						}
						title="このバックアップから復元しますか?"
						description="現在のサーバー上の全てのファイルがこのバックアップの内容で上書きされます。この操作は取り消せません。実行前にサーバーを停止しておくことを推奨します。"
						confirmLabel="復元する"
						onConfirm={onRestore}
					/>
					<Button
						size="icon"
						variant="ghost"
						className="h-8 w-8"
						title={backup.isLocked ? "ロックを解除" : "ロックする"}
						disabled={lockPending}
						onClick={onToggleLock}
					>
						{backup.isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
					</Button>
					<ConfirmDestructiveDialog
						trigger={
							<Button
								size="icon"
								variant="ghost"
								className="h-8 w-8 text-destructive hover:text-destructive"
								disabled={backup.isLocked}
								title={backup.isLocked ? "ロック中は削除できません" : "削除"}
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						}
						title={`バックアップ「${backup.name}」を削除しますか?`}
						description="削除したバックアップは復元できません。"
						confirmLabel="削除する"
						onConfirm={onDelete}
					/>
				</div>
			</div>
		</div>
	);
}

interface CreateBackupDialogProps {
	trigger: React.ReactNode;
	pending: boolean;
	onCreate: (name: string, ignoredFiles: string) => Promise<unknown>;
}

function CreateBackupDialog({ trigger, pending, onCreate }: CreateBackupDialogProps) {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [ignoredFiles, setIgnoredFiles] = useState("");
	const [error, setError] = useState<string | null>(null);

	function handleOpenChange(next: boolean) {
		if (next) {
			setName("");
			setIgnoredFiles("");
			setError(null);
		}
		setOpen(next);
	}

	async function handleSubmit() {
		setError(null);
		try {
			await onCreate(name.trim(), ignoredFiles.trim());
			setOpen(false);
		} catch (err) {
			setError(err instanceof NodeApiError ? err.message : "バックアップの作成に失敗しました。");
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>バックアップを作成</DialogTitle>
					<DialogDescription>
						サーバーの現在の状態をバックアップします。サーバーの規模によっては数分かかることがあります。
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="backup-name">
							バックアップ名(任意)
						</label>
						<input
							id="backup-name"
							autoFocus
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="未入力の場合は自動生成されます"
							className={inputClassName}
						/>
					</div>
					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="backup-ignored">
							除外するファイルパターン(任意、1行に1パターン)
						</label>
						<textarea
							id="backup-ignored"
							value={ignoredFiles}
							onChange={(e) => setIgnoredFiles(e.target.value)}
							placeholder={"*.log\ncache/*"}
							className={textareaClassName}
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
