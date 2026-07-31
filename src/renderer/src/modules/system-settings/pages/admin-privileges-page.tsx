import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { ConfirmDestructiveDialog } from "@renderer/components/common/confirm-destructive-dialog";
import { EntityList, EntityListItem } from "@renderer/components/common/entity-list";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
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
import { fetchAdminUsers, grantAdminPrivilege, revokeAdminPrivilege } from "@renderer/lib/api/system-settings/admin-privileges";
import { fetchSystemUsers } from "@renderer/lib/api/system-settings/users-groups";
import { NodeApiError } from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";

const selectClassName = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";

export function AdminPrivilegesPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();
	const [actionError, setActionError] = useState<string | null>(null);

	const ready = Boolean(node && token);

	const adminUsersQuery = useQuery({
		queryKey: ["system-settings-admin-users", nodeId],
		queryFn: () => fetchAdminUsers(node!, token!),
		enabled: ready,
		retry: 1,
	});

	const allUsersQuery = useQuery({
		queryKey: ["system-settings-users", nodeId],
		queryFn: () => fetchSystemUsers(node!, token!),
		enabled: ready,
		retry: 1,
	});

	async function refreshAdmins() {
		await queryClient.invalidateQueries({ queryKey: ["system-settings-admin-users", nodeId] });
	}

	async function handleGrant(username: string) {
		if (!node || !token) return;
		try {
			await grantAdminPrivilege(node, token, username);
			await refreshAdmins();
		} catch (error) {
			throw new Error(error instanceof NodeApiError ? error.message : "管理者権限の付与に失敗しました。");
		}
	}

	async function handleRevoke(username: string) {
		if (!node || !token) return;
		setActionError(null);
		try {
			await revokeAdminPrivilege(node, token, username);
			await refreshAdmins();
		} catch (error) {
			setActionError(error instanceof NodeApiError ? error.message : "管理者権限の削除に失敗しました。");
		}
	}

	const nonAdminUsers = (allUsersQuery.data ?? []).filter(
		(user) => !adminUsersQuery.data?.some((admin) => admin.username === user.username),
	);

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || adminUsersQuery.isLoading) statusMessage = "接続中...";
	else if (adminUsersQuery.isError)
		statusMessage =
			adminUsersQuery.error instanceof NodeApiError ? adminUsersQuery.error.message : "ノードに接続できませんでした。";
	else if (ready && adminUsersQuery.data?.length === 0) statusMessage = "管理者権限を持つユーザーはいません。";

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/system-settings`}
			backLabel="設定一覧に戻る"
			title="管理者権限の管理"
			description="どの利用者がsudo(管理者)操作を行えるかを管理します。/etc/sudoersは直接編集せず、sudoグループへの追加/削除のみで安全に権限を制御します。"
			actions={
				<GrantAdminDialog
					trigger={
						<Button size="sm" disabled={!ready || nonAdminUsers.length === 0}>
							<Plus className="h-4 w-4" /> 管理者を追加
						</Button>
					}
					candidates={nonAdminUsers.map((user) => user.username)}
					onGrant={handleGrant}
				/>
			}
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}
			{actionError && <p className="mb-4 text-sm text-destructive">{actionError}</p>}

			{adminUsersQuery.data && adminUsersQuery.data.length > 0 && (
				<EntityList>
					{adminUsersQuery.data.map((admin) => (
						<EntityListItem
							key={admin.username}
							icon={ShieldCheck}
							title={admin.username}
							subtitle={`所属グループ: ${admin.groups.join(", ")}`}
							badge={
								<ConfirmDestructiveDialog
									trigger={
										<Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive">
											<Trash2 className="h-4 w-4" />
										</Button>
									}
									title={`${admin.username} の管理者権限を削除しますか?`}
									description="sudoグループから削除され、このユーザーは管理者操作(sudo)ができなくなります。ログイン自体は継続できます。"
									confirmLabel="削除する"
									onConfirm={() => handleRevoke(admin.username)}
								/>
							}
						/>
					))}
				</EntityList>
			)}
		</DashboardPageLayout>
	);
}

interface GrantAdminDialogProps {
	trigger: ReactNode;
	candidates: string[];
	onGrant: (username: string) => Promise<void>;
}

function GrantAdminDialog({ trigger, candidates, onGrant }: GrantAdminDialogProps) {
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selected, setSelected] = useState("");

	function handleOpenChange(next: boolean) {
		if (next) {
			setSelected(candidates[0] ?? "");
			setError(null);
		}
		setOpen(next);
	}

	async function handleSubmit() {
		if (!selected) {
			setError("ユーザーを選択してください。");
			return;
		}
		setPending(true);
		setError(null);
		try {
			await onGrant(selected);
			setOpen(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : "管理者権限の付与に失敗しました。");
		} finally {
			setPending(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>管理者権限を付与</DialogTitle>
					<DialogDescription>
						選択したユーザーをsudoグループに追加します。付与されたユーザーはサーバー全体を操作できるようになります。
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="grant-username">
							対象ユーザー
						</label>
						<select
							id="grant-username"
							value={selected}
							onChange={(e) => setSelected(e.target.value)}
							className={selectClassName}
						>
							{candidates.map((username) => (
								<option key={username} value={username}>
									{username}
								</option>
							))}
						</select>
					</div>
					{selected && (
						<Badge variant="destructive" className="w-full justify-center py-1.5">
							{selected} にサーバー全体の管理者権限を付与します
						</Badge>
					)}
					{error && <p className="text-sm text-destructive">{error}</p>}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)}>
						キャンセル
					</Button>
					<Button disabled={pending || !selected} onClick={handleSubmit}>
						{pending ? "付与中..." : "付与する"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
