import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, UserRound } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { ConfirmDestructiveDialog } from "@renderer/components/common/confirm-destructive-dialog";
import { EntityList, EntityListItem } from "@renderer/components/common/entity-list";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Badge } from "@renderer/components/ui/badge";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
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
import { createSystemUser, deleteSystemUser, fetchSystemGroups, fetchSystemUsers } from "@renderer/lib/api/system-settings/users-groups";
import { NodeApiError } from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";

const inputClassName = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";
const USERNAME_PATTERN = /^[a-z][-a-z0-9_]{0,31}$/;

export function UsersGroupsPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();
	const [actionError, setActionError] = useState<string | null>(null);

	const ready = Boolean(node && token);

	const usersQuery = useQuery({
		queryKey: ["system-settings-users", nodeId],
		queryFn: () => fetchSystemUsers(node!, token!),
		enabled: ready,
		retry: 1,
	});

	const groupsQuery = useQuery({
		queryKey: ["system-settings-groups", nodeId],
		queryFn: () => fetchSystemGroups(node!, token!),
		enabled: ready,
		retry: 1,
	});

	async function refreshAll() {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: ["system-settings-users", nodeId] }),
			queryClient.invalidateQueries({ queryKey: ["system-settings-groups", nodeId] }),
		]);
	}

	async function handleCreate(username: string, password: string) {
		if (!node || !token) return;
		try {
			await createSystemUser(node, token, { username, password: password || undefined });
			await refreshAll();
		} catch (error) {
			throw new Error(error instanceof NodeApiError ? error.message : "ユーザーの作成に失敗しました。");
		}
	}

	async function handleDelete(username: string) {
		if (!node || !token) return;
		setActionError(null);
		try {
			await deleteSystemUser(node, token, username);
			await refreshAll();
		} catch (error) {
			setActionError(error instanceof NodeApiError ? error.message : "ユーザーの削除に失敗しました。");
		}
	}

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || usersQuery.isLoading) statusMessage = "接続中...";
	else if (usersQuery.isError)
		statusMessage = usersQuery.error instanceof NodeApiError ? usersQuery.error.message : "ノードに接続できませんでした。";
	else if (ready && usersQuery.data?.length === 0) statusMessage = "登録済みのユーザーはいません。";

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/system-settings`}
			backLabel="設定一覧に戻る"
			title="ユーザー・グループ管理"
			description="サーバーにログインできる利用者とグループを管理します。重要なユーザーを削除するとサーバーにログインできなくなる可能性があるため、操作前に必ず確認してください。"
			actions={
				<CreateUserDialog
					trigger={
						<Button size="sm" disabled={!ready}>
							<Plus className="h-4 w-4" /> ユーザーを追加
						</Button>
					}
					onCreate={handleCreate}
				/>
			}
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}
			{actionError && <p className="mb-4 text-sm text-destructive">{actionError}</p>}

			{usersQuery.data && usersQuery.data.length > 0 && (
				<EntityList className="mb-6">
					{usersQuery.data.map((user) => (
						<EntityListItem
							key={user.username}
							icon={UserRound}
							title={user.username}
							subtitle={user.homeDir}
							meta={`UID ${user.uid} / ${user.shell}`}
							badge={
								<ConfirmDestructiveDialog
									trigger={
										<Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive">
											<Trash2 className="h-4 w-4" />
										</Button>
									}
									title={`${user.username} を削除しますか?`}
									description={`このユーザーとホームディレクトリ(${user.homeDir})が完全に削除されます。この操作は取り消せません。`}
									confirmLabel="削除する"
									onConfirm={() => handleDelete(user.username)}
								/>
							}
						/>
					))}
				</EntityList>
			)}

			<Card>
				<CardHeader>
					<CardTitle className="text-sm">グループ一覧</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2">
					{groupsQuery.isLoading && <p className="text-sm text-muted-foreground">読み込み中...</p>}
					{groupsQuery.data?.map((group) => (
						<div key={group.name} className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3">
							<div className="min-w-0">
								<p className="text-sm font-medium">{group.name}</p>
								<p className="truncate text-xs text-muted-foreground">
									{group.members.length > 0 ? group.members.join(", ") : "メンバーなし"}
								</p>
							</div>
							<Badge variant="secondary">GID {group.gid}</Badge>
						</div>
					))}
				</CardContent>
			</Card>
		</DashboardPageLayout>
	);
}

interface CreateUserDialogProps {
	trigger: ReactNode;
	onCreate: (username: string, password: string) => Promise<void>;
}

function CreateUserDialog({ trigger, onCreate }: CreateUserDialogProps) {
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");

	function handleOpenChange(next: boolean) {
		if (next) {
			setUsername("");
			setPassword("");
			setError(null);
		}
		setOpen(next);
	}

	async function handleSubmit() {
		if (!USERNAME_PATTERN.test(username)) {
			setError("ユーザー名は英小文字で始まり、英小文字・数字・-・_のみ使用できます。");
			return;
		}
		if (password.length > 0 && password.length < 8) {
			setError("初期パスワードは8文字以上で指定してください。");
			return;
		}
		setPending(true);
		setError(null);
		try {
			await onCreate(username, password);
			setOpen(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : "ユーザーの作成に失敗しました。");
		} finally {
			setPending(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>ユーザーを追加</DialogTitle>
					<DialogDescription>
						新しいログインユーザーを作成します。パスワードを省略した場合は、後からSSH公開鍵での接続設定が必要になります。
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="new-username">
							ユーザー名
						</label>
						<input
							id="new-username"
							autoFocus
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							placeholder="taro"
							className={`${inputClassName} font-mono`}
						/>
					</div>
					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="new-password">
							初期パスワード(任意、8文字以上)
						</label>
						<input
							id="new-password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="空欄の場合は未設定"
							className={inputClassName}
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
