import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ArchiveRestore,
	Copy,
	Download,
	File as FileIcon,
	FileArchive,
	Folder,
	FolderPlus,
	Home,
	Pencil,
	RefreshCw,
	Save,
	Trash2,
	Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ConfirmDestructiveDialog } from "@renderer/components/common/confirm-destructive-dialog";
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
	type GameServerFile,
	compressGameServerFiles,
	copyGameServerFile,
	createGameServerFolder,
	decompressGameServerFile,
	deleteGameServerFiles,
	fetchGameServerFileContents,
	fetchGameServerFileDownloadUrl,
	fetchGameServerFileUploadUrl,
	fetchGameServerFiles,
	renameGameServerFile,
	writeGameServerFileContents,
} from "@renderer/lib/api/game-servers/files";
import { NodeApiError } from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";
import type { NodeEntry } from "../../../../../shared/config-schema";

const inputClassName = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";
const ARCHIVE_EXTENSIONS = [".zip", ".tar", ".tar.gz", ".tar.bz2", ".tgz"];

function isArchiveFile(name: string): boolean {
	const lower = name.toLowerCase();
	return ARCHIVE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function joinPath(directory: string, name: string): string {
	if (directory === "/" || directory === "") return `/${name}`;
	return `${directory.replace(/\/+$/, "")}/${name}`;
}

function breadcrumbSegments(directory: string): Array<{ label: string; path: string }> {
	const parts = directory.split("/").filter(Boolean);
	let acc = "";
	return parts.map((part) => {
		acc += `/${part}`;
		return { label: part, path: acc };
	});
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	const units = ["KB", "MB", "GB", "TB"];
	let value = bytes;
	let unitIndex = -1;
	do {
		value /= 1024;
		unitIndex++;
	} while (value >= 1024 && unitIndex < units.length - 1);
	return `${value.toFixed(1)} ${units[unitIndex]}`;
}

function formatDate(iso: string): string {
	const date = new Date(iso);
	return Number.isNaN(date.getTime()) ? iso : date.toLocaleString("ja-JP");
}

/** ファイル管理タブ。`/game-servers/files/:identifier/*`のAPIを利用してサーバーのファイルを管理する */
export function FilesTab() {
	const { nodeId, identifier } = useParams<{ nodeId: string; identifier: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();

	const [directory, setDirectory] = useState("/");
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [editingFile, setEditingFile] = useState<string | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);
	const uploadInputRef = useRef<HTMLInputElement>(null);

	const ready = Boolean(node && token && identifier);
	const filesQueryKey = ["game-server-files", nodeId, identifier, directory];

	const filesQuery = useQuery({
		queryKey: filesQueryKey,
		queryFn: () => fetchGameServerFiles(node!, token!, identifier!, directory),
		enabled: ready,
		retry: 1,
	});

	function navigateTo(path: string) {
		setSelected(new Set());
		setDirectory(path);
	}

	async function refreshList() {
		await queryClient.invalidateQueries({ queryKey: filesQueryKey });
	}

	function toggleSelected(name: string) {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(name)) next.delete(name);
			else next.add(name);
			return next;
		});
	}

	const createFolderMutation = useMutation({
		mutationFn: (name: string) => createGameServerFolder(node!, token!, identifier!, directory, name),
		onSuccess: refreshList,
	});

	const renameMutation = useMutation({
		mutationFn: (input: { from: string; to: string }) =>
			renameGameServerFile(node!, token!, identifier!, directory, [input]),
		onSuccess: refreshList,
	});

	const copyMutation = useMutation({
		mutationFn: (name: string) => copyGameServerFile(node!, token!, identifier!, joinPath(directory, name)),
		onSuccess: refreshList,
		onError: (error) => {
			setActionError(error instanceof NodeApiError ? error.message : "コピーに失敗しました。");
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (names: string[]) => deleteGameServerFiles(node!, token!, identifier!, directory, names),
		onSuccess: () => {
			setSelected(new Set());
			return refreshList();
		},
		onError: (error) => {
			setActionError(error instanceof NodeApiError ? error.message : "削除に失敗しました。");
		},
	});

	const compressMutation = useMutation({
		mutationFn: (names: string[]) => compressGameServerFiles(node!, token!, identifier!, directory, names),
		onSuccess: () => {
			setSelected(new Set());
			return refreshList();
		},
		onError: (error) => {
			setActionError(error instanceof NodeApiError ? error.message : "圧縮に失敗しました。");
		},
	});

	const decompressMutation = useMutation({
		mutationFn: (name: string) => decompressGameServerFile(node!, token!, identifier!, directory, name),
		onSuccess: () => {
			setSelected(new Set());
			return refreshList();
		},
		onError: (error) => {
			setActionError(error instanceof NodeApiError ? error.message : "展開に失敗しました。");
		},
	});

	const uploadMutation = useMutation({
		mutationFn: async (fileList: FileList) => {
			const uploadUrl = await fetchGameServerFileUploadUrl(node!, token!, identifier!, directory);
			for (const file of Array.from(fileList)) {
				const formData = new FormData();
				formData.append("files", file);
				formData.append("directory", directory);
				const response = await fetch(uploadUrl, { method: "POST", body: formData });
				if (!response.ok) {
					throw new Error(`アップロードに失敗しました(${file.name}): HTTP ${response.status}`);
				}
			}
		},
		onSuccess: refreshList,
		onError: (error) => {
			setActionError(error instanceof Error ? error.message : "アップロードに失敗しました。");
		},
	});

	async function handleDownload(name: string) {
		if (!node || !token || !identifier) return;
		setActionError(null);
		try {
			const url = await fetchGameServerFileDownloadUrl(node, token, identifier, joinPath(directory, name));
			window.open(url, "_blank");
		} catch (error) {
			setActionError(error instanceof NodeApiError ? error.message : "ダウンロードURLの取得に失敗しました。");
		}
	}

	function handleUploadClick() {
		uploadInputRef.current?.click();
	}

	function handleUploadChange(event: React.ChangeEvent<HTMLInputElement>) {
		const fileList = event.target.files;
		if (fileList && fileList.length > 0) {
			uploadMutation.mutate(fileList);
		}
		event.target.value = "";
	}

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || filesQuery.isLoading) statusMessage = "接続中...";
	else if (filesQuery.isError) {
		statusMessage = filesQuery.error instanceof NodeApiError ? filesQuery.error.message : "ファイル一覧の取得に失敗しました。";
	}

	const files = [...(filesQuery.data ?? [])].sort((a, b) => {
		if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
		return a.name.localeCompare(b.name, "ja");
	});

	const segments = breadcrumbSegments(directory);
	const selectedNames = Array.from(selected);
	const canDecompress = selectedNames.length === 1 && isArchiveFile(selectedNames[0]);

	return (
		<div className="flex flex-1 flex-col gap-3 overflow-hidden">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div>
					<p className="text-sm font-medium">ファイル管理</p>
					<p className="text-xs text-muted-foreground">サーバーのファイルを閲覧・編集・アップロード/ダウンロードできます。</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<CreateFolderDialog
						trigger={
							<Button size="sm" variant="outline" disabled={!ready}>
								<FolderPlus className="h-4 w-4" /> 新しいフォルダ
							</Button>
						}
						pending={createFolderMutation.isPending}
						onCreate={(name) => createFolderMutation.mutateAsync(name)}
					/>
					<input ref={uploadInputRef} type="file" multiple className="hidden" onChange={handleUploadChange} />
					<Button size="sm" variant="outline" disabled={!ready || uploadMutation.isPending} onClick={handleUploadClick}>
						<Upload className="h-4 w-4" /> {uploadMutation.isPending ? "アップロード中..." : "アップロード"}
					</Button>
					<Button size="sm" variant="ghost" disabled={!ready} onClick={() => refreshList()}>
						<RefreshCw className="h-4 w-4" /> 更新
					</Button>
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-1 text-xs">
				<button
					type="button"
					onClick={() => navigateTo("/")}
					className="flex items-center gap-1 rounded px-1.5 py-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
				>
					<Home className="h-3.5 w-3.5" /> ルート
				</button>
				{segments.map((segment) => (
					<span key={segment.path} className="flex items-center gap-1">
						<span className="text-muted-foreground">/</span>
						<button
							type="button"
							onClick={() => navigateTo(segment.path)}
							className="rounded px-1.5 py-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
						>
							{segment.label}
						</button>
					</span>
				))}
			</div>

			{selectedNames.length > 0 && (
				<div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
					<p className="text-xs text-muted-foreground">{selectedNames.length}件選択中</p>
					<Button
						size="sm"
						variant="outline"
						disabled={compressMutation.isPending}
						onClick={() => compressMutation.mutate(selectedNames)}
					>
						<FileArchive className="h-4 w-4" /> 圧縮
					</Button>
					{canDecompress && (
						<Button
							size="sm"
							variant="outline"
							disabled={decompressMutation.isPending}
							onClick={() => decompressMutation.mutate(selectedNames[0])}
						>
							<ArchiveRestore className="h-4 w-4" /> 展開
						</Button>
					)}
					<ConfirmDestructiveDialog
						trigger={
							<Button size="sm" variant="destructive" disabled={deleteMutation.isPending}>
								<Trash2 className="h-4 w-4" /> 削除
							</Button>
						}
						title={`選択した${selectedNames.length}件を削除しますか?`}
						description="この操作は取り消せません。フォルダの場合は中身ごと削除されます。"
						confirmLabel="削除する"
						onConfirm={() => deleteMutation.mutateAsync(selectedNames)}
					/>
					<Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
						選択解除
					</Button>
				</div>
			)}

			{statusMessage && <p className="text-sm text-muted-foreground">{statusMessage}</p>}
			{actionError && <p className="text-sm text-destructive">{actionError}</p>}

			{!statusMessage && files.length === 0 && <p className="text-sm text-muted-foreground">このフォルダは空です。</p>}

			{files.length > 0 && (
				<div className="min-h-0 flex-1 overflow-y-auto rounded-md border">
					<div className="divide-y divide-border">
						{files.map((file) => (
							<FileRow
								key={file.name}
								file={file}
								checked={selected.has(file.name)}
								onToggle={() => toggleSelected(file.name)}
								onOpen={() => {
									if (file.isFile) setEditingFile(joinPath(directory, file.name));
									else navigateTo(joinPath(directory, file.name));
								}}
								onDownload={file.isFile ? () => handleDownload(file.name) : undefined}
								onCopy={() => copyMutation.mutate(file.name)}
								onRename={(to) => renameMutation.mutateAsync({ from: file.name, to })}
								onDelete={() => deleteMutation.mutateAsync([file.name])}
							/>
						))}
					</div>
				</div>
			)}

			{editingFile && node && token && identifier && (
				<FileEditorDialog
					node={node}
					token={token}
					identifier={identifier}
					filePath={editingFile}
					onClose={() => setEditingFile(null)}
					onSaved={refreshList}
				/>
			)}
		</div>
	);
}

interface FileRowProps {
	file: GameServerFile;
	checked: boolean;
	onToggle: () => void;
	onOpen: () => void;
	onDownload?: () => void;
	onCopy: () => void;
	onRename: (to: string) => Promise<void>;
	onDelete: () => Promise<void>;
}

function FileRow({ file, checked, onToggle, onOpen, onDownload, onCopy, onRename, onDelete }: FileRowProps) {
	return (
		<div className="flex items-center gap-3 px-3 py-2 text-sm">
			<input
				type="checkbox"
				checked={checked}
				onChange={onToggle}
				className="h-4 w-4 shrink-0 rounded border-input"
				aria-label={`${file.name}を選択`}
			/>
			{file.isFile ? (
				<FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
			) : (
				<Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
			)}
			<button
				type="button"
				onClick={onOpen}
				className="min-w-0 flex-1 truncate text-left font-medium hover:underline"
				title={file.name}
			>
				{file.name}
			</button>
			<span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
				{file.isFile ? formatBytes(file.size) : ""}
			</span>
			<span className="hidden shrink-0 text-xs text-muted-foreground md:inline">{formatDate(file.modifiedAt)}</span>
			<div className="flex shrink-0 items-center gap-0.5">
				{onDownload && (
					<Button size="icon" variant="ghost" className="h-8 w-8" title="ダウンロード" onClick={onDownload}>
						<Download className="h-4 w-4" />
					</Button>
				)}
				<Button size="icon" variant="ghost" className="h-8 w-8" title="コピーを作成" onClick={onCopy}>
					<Copy className="h-4 w-4" />
				</Button>
				<RenameDialog
					trigger={
						<Button size="icon" variant="ghost" className="h-8 w-8" title="名前を変更">
							<Pencil className="h-4 w-4" />
						</Button>
					}
					currentName={file.name}
					onRename={onRename}
				/>
				<ConfirmDestructiveDialog
					trigger={
						<Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" title="削除">
							<Trash2 className="h-4 w-4" />
						</Button>
					}
					title={`「${file.name}」を削除しますか?`}
					description="この操作は取り消せません。フォルダの場合は中身ごと削除されます。"
					confirmLabel="削除する"
					onConfirm={onDelete}
				/>
			</div>
		</div>
	);
}

interface CreateFolderDialogProps {
	trigger: React.ReactNode;
	pending: boolean;
	onCreate: (name: string) => Promise<unknown>;
}

function CreateFolderDialog({ trigger, pending, onCreate }: CreateFolderDialogProps) {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);

	function handleOpenChange(next: boolean) {
		if (next) {
			setName("");
			setError(null);
		}
		setOpen(next);
	}

	async function handleSubmit() {
		if (!name.trim()) {
			setError("フォルダ名を入力してください。");
			return;
		}
		setError(null);
		try {
			await onCreate(name.trim());
			setOpen(false);
		} catch (err) {
			setError(err instanceof NodeApiError ? err.message : "フォルダの作成に失敗しました。");
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>新しいフォルダ</DialogTitle>
					<DialogDescription>現在のディレクトリにフォルダを作成します。</DialogDescription>
				</DialogHeader>
				<div className="space-y-1">
					<input
						autoFocus
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="plugins"
						className={`${inputClassName} font-mono`}
					/>
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

interface RenameDialogProps {
	trigger: React.ReactNode;
	currentName: string;
	onRename: (to: string) => Promise<void>;
}

function RenameDialog({ trigger, currentName, onRename }: RenameDialogProps) {
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [name, setName] = useState(currentName);
	const [error, setError] = useState<string | null>(null);

	function handleOpenChange(next: boolean) {
		if (next) {
			setName(currentName);
			setError(null);
		}
		setOpen(next);
	}

	async function handleSubmit() {
		if (!name.trim() || name.trim() === currentName) {
			setError("新しい名前を入力してください。");
			return;
		}
		setPending(true);
		setError(null);
		try {
			await onRename(name.trim());
			setOpen(false);
		} catch (err) {
			setError(err instanceof NodeApiError ? err.message : "名前の変更に失敗しました。");
		} finally {
			setPending(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>名前を変更</DialogTitle>
					<DialogDescription>「{currentName}」の新しい名前を入力してください。</DialogDescription>
				</DialogHeader>
				<div className="space-y-1">
					<input
						autoFocus
						value={name}
						onChange={(e) => setName(e.target.value)}
						className={`${inputClassName} font-mono`}
					/>
					{error && <p className="text-sm text-destructive">{error}</p>}
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)}>
						キャンセル
					</Button>
					<Button disabled={pending} onClick={handleSubmit}>
						{pending ? "変更中..." : "変更する"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

interface FileEditorDialogProps {
	node: NodeEntry;
	token: string;
	identifier: string;
	filePath: string;
	onClose: () => void;
	onSaved: () => Promise<unknown>;
}

function FileEditorDialog({ node, token, identifier, filePath, onClose, onSaved }: FileEditorDialogProps) {
	const [content, setContent] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const queryClient = useQueryClient();
	const contentsQueryKey = ["game-server-file-contents", node.id, identifier, filePath];

	const contentsQuery = useQuery({
		queryKey: contentsQueryKey,
		queryFn: () => fetchGameServerFileContents(node, token, identifier, filePath),
		retry: 1,
	});

	useEffect(() => {
		if (contentsQuery.data !== undefined && content === null) {
			setContent(contentsQuery.data);
		}
	}, [contentsQuery.data, content]);

	const writeMutation = useMutation({
		mutationFn: (value: string) => writeGameServerFileContents(node, token, identifier, filePath, value),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: contentsQueryKey });
			await onSaved();
		},
		onError: (err) => {
			setError(err instanceof NodeApiError ? err.message : "保存に失敗しました。");
		},
	});

	const dirty = content !== null && content !== contentsQuery.data;

	return (
		<Dialog
			open
			onOpenChange={(next) => {
				if (!next) onClose();
			}}
		>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle className="break-all font-mono text-sm">{filePath}</DialogTitle>
					<DialogDescription>ファイルの内容を編集できます。保存すると即座にサーバー上のファイルが上書きされます。</DialogDescription>
				</DialogHeader>

				{contentsQuery.isLoading && <p className="text-sm text-muted-foreground">読み込み中...</p>}
				{contentsQuery.isError && (
					<p className="text-sm text-destructive">
						{contentsQuery.error instanceof NodeApiError ? contentsQuery.error.message : "内容の取得に失敗しました。"}
					</p>
				)}

				{content !== null && (
					<textarea
						value={content}
						onChange={(e) => setContent(e.target.value)}
						spellCheck={false}
						className="h-96 w-full resize-none rounded-md border border-input bg-background p-3 font-mono text-xs"
					/>
				)}

				{error && <p className="text-sm text-destructive">{error}</p>}

				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						閉じる
					</Button>
					<Button
						disabled={!dirty || writeMutation.isPending || content === null}
						onClick={() => content !== null && writeMutation.mutate(content)}
					>
						<Save className="h-4 w-4" /> {writeMutation.isPending ? "保存中..." : "保存"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
