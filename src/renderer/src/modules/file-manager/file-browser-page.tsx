import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ChevronRight,
	File,
	Folder,
	FolderPlus,
	Home,
	MoreHorizontal,
	Pencil,
	Trash2,
	Upload,
} from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ConfirmDestructiveDialog } from "@renderer/components/common/confirm-destructive-dialog";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Button } from "@renderer/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@renderer/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@renderer/components/ui/dropdown-menu";
import { Input } from "@renderer/components/ui/input";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import {
	NodeApiError,
	createDirectory,
	deleteFileOrDirectory,
	fetchFileList,
	renameFileOrDirectory,
} from "@renderer/lib/node-api-client";
import { formatBytes } from "@renderer/lib/utils";
import { useNodesStore } from "@renderer/state/nodes-store";
import type { FileEntry } from "@renderer/lib/node-api-client";

export function FileBrowserPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const navigate = useNavigate();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();

	const [currentPath, setCurrentPath] = useState("/");
	const [mkdirOpen, setMkdirOpen] = useState(false);
	const [mkdirName, setMkdirName] = useState("");
	const [renameOpen, setRenameOpen] = useState(false);
	const [renameTarget, setRenameTarget] = useState<FileEntry | null>(null);
	const [renameName, setRenameName] = useState("");

	const ready = Boolean(node && token);

	const listQuery = useQuery({
		queryKey: ["file-manager-list", nodeId, currentPath],
		queryFn: () => fetchFileList(node!, token!, currentPath),
		enabled: ready,
		retry: 1,
	});

	const mkdirMutation = useMutation({
		mutationFn: (name: string) => {
			const newPath = currentPath === "/" ? `/${name}` : `${currentPath}/${name}`;
			return createDirectory(node!, token!, newPath);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["file-manager-list", nodeId, currentPath] });
			setMkdirOpen(false);
			setMkdirName("");
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (targetPath: string) => deleteFileOrDirectory(node!, token!, targetPath),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["file-manager-list", nodeId, currentPath] });
		},
	});

	const renameMutation = useMutation({
		mutationFn: ({ oldPath, newName }: { oldPath: string; newName: string }) => {
			const dir = oldPath.substring(0, oldPath.lastIndexOf("/")) || "/";
			const newPath = dir === "/" ? `/${newName}` : `${dir}/${newName}`;
			return renameFileOrDirectory(node!, token!, oldPath, newPath);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["file-manager-list", nodeId, currentPath] });
			setRenameOpen(false);
			setRenameTarget(null);
			setRenameName("");
		},
	});

	const breadcrumbs = buildBreadcrumbs(currentPath);

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || listQuery.isLoading) statusMessage = "読み込み中...";
	else if (listQuery.isError)
		statusMessage =
			listQuery.error instanceof NodeApiError
				? listQuery.error.message
				: "ファイル一覧を取得できませんでした。";

	const items = listQuery.data?.items ?? [];
	const sorted = [...items].sort((a, b) => {
		if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
		return a.name.localeCompare(b.name);
	});

	function openRenameDialog(entry: FileEntry) {
		setRenameTarget(entry);
		setRenameName(entry.name);
		setRenameOpen(true);
	}

	return (
		<DashboardPageLayout
			title="ファイルマネージャー"
			description="サーバー上のファイルを管理します。"
			actions={
				<div className="flex gap-2">
					<Button variant="outline" size="sm" disabled title="アップロード機能は未実装">
						<Upload className="mr-1.5 h-4 w-4" />
						アップロード
					</Button>
					<Button size="sm" onClick={() => setMkdirOpen(true)}>
						<FolderPlus className="mr-1.5 h-4 w-4" />
						新規フォルダ
					</Button>
				</div>
			}
		>
			<nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
				{breadcrumbs.map((crumb, i) => (
					<span key={crumb.path} className="flex items-center gap-1">
						{i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
						{i === 0 ? (
							<button
								type="button"
								className="flex items-center gap-1 hover:text-foreground"
								onClick={() => setCurrentPath("/")}
							>
								<Home className="h-3.5 w-3.5" />
								ルート
							</button>
						) : i === breadcrumbs.length - 1 ? (
							<span className="font-medium text-foreground">{crumb.label}</span>
						) : (
							<button
								type="button"
								className="hover:text-foreground"
								onClick={() => setCurrentPath(crumb.path)}
							>
								{crumb.label}
							</button>
						)}
					</span>
				))}
			</nav>

			{statusMessage && <p className="text-sm text-muted-foreground">{statusMessage}</p>}

			{!statusMessage && sorted.length === 0 && (
				<p className="text-sm text-muted-foreground">このディレクトリは空です。</p>
			)}

			{sorted.length > 0 && (
				<div className="overflow-hidden rounded-lg border border-border">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
								<th className="px-4 py-2 text-left font-medium">名前</th>
								<th className="hidden px-4 py-2 text-right font-medium sm:table-cell">サイズ</th>
								<th className="hidden px-4 py-2 text-left font-medium md:table-cell">更新日時</th>
								<th className="hidden px-4 py-2 text-left font-medium lg:table-cell">パーミッション</th>
								<th className="w-10 px-2 py-2" />
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{sorted.map((entry) => (
								<tr
									key={entry.path}
									className="group transition-colors hover:bg-accent/40"
								>
									<td className="px-4 py-2.5">
										<button
											type="button"
											className="flex items-center gap-2 text-left"
											onClick={() => {
												if (entry.type === "directory") {
													setCurrentPath(entry.path);
												} else {
													navigate(`editor?path=${encodeURIComponent(entry.path)}`);
												}
											}}
										>
											{entry.type === "directory" ? (
												<Folder className="h-4 w-4 shrink-0 text-blue-400" />
											) : (
												<File className="h-4 w-4 shrink-0 text-muted-foreground" />
											)}
											<span className={entry.type === "directory" ? "font-medium" : ""}>{entry.name}</span>
										</button>
									</td>
									<td className="hidden px-4 py-2.5 text-right text-muted-foreground sm:table-cell">
										{entry.type === "file" && entry.size !== null ? formatBytes(entry.size) : "—"}
									</td>
									<td className="hidden px-4 py-2.5 text-muted-foreground md:table-cell">
										{entry.modifiedAt ? new Date(entry.modifiedAt).toLocaleString("ja-JP") : "—"}
									</td>
									<td className="hidden px-4 py-2.5 font-mono text-muted-foreground lg:table-cell">
										{entry.permissions ?? "—"}
									</td>
									<td className="px-2 py-2.5 text-right">
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
													<MoreHorizontal className="h-4 w-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												{entry.type === "file" && (
													<DropdownMenuItem
														onClick={() =>
															navigate(`editor?path=${encodeURIComponent(entry.path)}`)
														}
													>
														<Pencil className="mr-2 h-4 w-4" />
														開く
													</DropdownMenuItem>
												)}
												<DropdownMenuItem onClick={() => openRenameDialog(entry)}>
													<Pencil className="mr-2 h-4 w-4" />
													名前変更
												</DropdownMenuItem>
												<DropdownMenuItem
													className="text-destructive focus:text-destructive"
													onClick={() => deleteMutation.mutate(entry.path)}
												>
													<Trash2 className="mr-2 h-4 w-4" />
													削除
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			<Dialog open={mkdirOpen} onOpenChange={setMkdirOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>新規フォルダの作成</DialogTitle>
					</DialogHeader>
					<Input
						placeholder="フォルダ名"
						value={mkdirName}
						onChange={(e) => setMkdirName(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && mkdirName.trim()) mkdirMutation.mutate(mkdirName.trim());
						}}
					/>
					{mkdirMutation.isError && (
						<p className="text-sm text-destructive">
							{mkdirMutation.error instanceof NodeApiError
								? mkdirMutation.error.message
								: "作成に失敗しました。"}
						</p>
					)}
					<DialogFooter>
						<Button variant="outline" onClick={() => setMkdirOpen(false)}>
							キャンセル
						</Button>
						<Button
							disabled={!mkdirName.trim() || mkdirMutation.isPending}
							onClick={() => mkdirMutation.mutate(mkdirName.trim())}
						>
							{mkdirMutation.isPending ? "作成中..." : "作成"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={renameOpen} onOpenChange={setRenameOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>名前変更</DialogTitle>
					</DialogHeader>
					<Input
						placeholder="新しい名前"
						value={renameName}
						onChange={(e) => setRenameName(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && renameName.trim() && renameTarget)
								renameMutation.mutate({ oldPath: renameTarget.path, newName: renameName.trim() });
						}}
					/>
					{renameMutation.isError && (
						<p className="text-sm text-destructive">
							{renameMutation.error instanceof NodeApiError
								? renameMutation.error.message
								: "名前変更に失敗しました。"}
						</p>
					)}
					<DialogFooter>
						<Button variant="outline" onClick={() => setRenameOpen(false)}>
							キャンセル
						</Button>
						<Button
							disabled={!renameName.trim() || renameMutation.isPending || !renameTarget}
							onClick={() => {
								if (renameTarget) renameMutation.mutate({ oldPath: renameTarget.path, newName: renameName.trim() });
							}}
						>
							{renameMutation.isPending ? "変更中..." : "変更"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<ConfirmDestructiveDialog
				trigger={<span />}
				title="削除の確認"
				description="この操作は取り消せません。本当に削除しますか？"
				confirmLabel="削除する"
				onConfirm={() => Promise.resolve()}
			/>
		</DashboardPageLayout>
	);
}

function buildBreadcrumbs(currentPath: string): { label: string; path: string }[] {
	if (currentPath === "/") return [{ label: "ルート", path: "/" }];
	const parts = currentPath.split("/").filter(Boolean);
	const crumbs = [{ label: "ルート", path: "/" }];
	let accumulated = "";
	for (const part of parts) {
		accumulated += `/${part}`;
		crumbs.push({ label: part, path: accumulated });
	}
	return crumbs;
}
