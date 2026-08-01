import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { ConfirmDestructiveDialog } from "@renderer/components/common/confirm-destructive-dialog";
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
	NodeApiError,
	SUBUSER_PERMISSION_GROUPS,
	fetchSubusers,
	inviteSubuser,
	removeSubuser,
	updateSubuserPermissions,
} from "@renderer/lib/api/game-servers/subusers";
import { useNodesStore } from "@renderer/state/nodes-store";
import { TabPlaceholder } from "../shared";

const inputClassName = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";

/** サブユーザー(共同管理者)タブ。Pterodactyl Client APIの`user.*`権限に対応する */
export function SubusersTab() {
	const { nodeId, identifier } = useParams<{ nodeId: string; identifier: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();
	const [actionError, setActionError] = useState<string | null>(null);

	const ready = Boolean(node && token && identifier);

	const subusersQuery = useQuery({
		queryKey: ["game-server-subusers", nodeId, identifier],
		queryFn: () => fetchSubusers(node!, token!, identifier!),
		enabled: ready,
		retry: 1,
	});

	async function refresh() {
		await queryClient.invalidateQueries({ queryKey: ["game-server-subusers", nodeId, identifier] });
	}

	async function handleInvite(email: string, permissions: string[]) {
		if (!node || !token || !identifier) return;
		try {
			await inviteSubuser(node, token, identifier, email, permissions);
			await refresh();
		} catch (error) {
			throw new Error(error instanceof NodeApiError ? error.message : "サブユーザーの追加に失敗しました。");
		}
	}

	async function handleUpdatePermissions(subuserUuid: string, permissions: string[]) {
		if (!node || !token || !identifier) return;
		try {
			await updateSubuserPermissions(node, token, identifier, subuserUuid, permissions);
			await refresh();
		} catch (error) {
			throw new Error(error instanceof NodeApiError ? error.message : "権限の更新に失敗しました。");
		}
	}

	async function handleRemove(subuserUuid: string) {
		if (!node || !token || !identifier) return;
		setActionError(null);
		try {
			await removeSubuser(node, token, identifier, subuserUuid);
			await refresh();
		} catch (error) {
			setActionError(error instanceof NodeApiError ? error.message : "サブユーザーの削除に失敗しました。");
		}
	}

	let statusMessage: string | undefined;
	if (!node || !identifier) statusMessage = "サーバー情報を読み込めませんでした。";
	else if (tokenLoading || subusersQuery.isLoading) statusMessage = "読み込み中...";
	else if (subusersQuery.isError)
		statusMessage =
			subusersQuery.error instanceof NodeApiError ? subusersQuery.error.message : "サブユーザーの取得に失敗しました。";
	else if (ready && subusersQuery.data?.length === 0) statusMessage = "登録されているサブユーザーはいません。";

	if (!ready && !statusMessage) {
		return <TabPlaceholder title="接続情報を取得できません" description="ノードへの接続情報を確認してください。" />;
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between gap-3">
				<p className="text-xs text-muted-foreground">
					このサーバーを操作できる共同管理者(サブユーザー)を管理します。権限はサーバー単位で個別に設定されます。
				</p>
				<SubuserFormDialog
					mode="invite"
					trigger={
						<Button size="sm" disabled={!ready}>
							<Plus className="h-4 w-4" /> サブユーザーを追加
						</Button>
					}
					onSubmit={(email, permissions) => handleInvite(email ?? "", permissions)}
				/>
			</div>

			{statusMessage && <p className="text-sm text-muted-foreground">{statusMessage}</p>}
			{actionError && <p className="text-sm text-destructive">{actionError}</p>}

			<div className="space-y-2">
				{subusersQuery.data?.map((subuser) => (
					<div key={subuser.uuid} className="rounded-lg border bg-card p-4">
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div className="flex min-w-0 items-center gap-3">
								<UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
								<div className="min-w-0">
									<p className="truncate text-sm font-medium">{subuser.username ?? subuser.email}</p>
									<p className="truncate text-xs text-muted-foreground">{subuser.email}</p>
								</div>
								{subuser.twoFactorEnabled && (
									<Badge variant="secondary" className="shrink-0">
										<ShieldCheck className="mr-1 h-3 w-3" /> 2FA有効
									</Badge>
								)}
							</div>
							<div className="flex shrink-0 items-center gap-2">
								<SubuserFormDialog
									mode="edit"
									initialPermissions={subuser.permissions}
									trigger={
										<Button size="icon" variant="ghost" className="h-8 w-8">
											<Pencil className="h-4 w-4" />
										</Button>
									}
									onSubmit={(_email, permissions) => handleUpdatePermissions(subuser.uuid, permissions)}
								/>
								<ConfirmDestructiveDialog
									trigger={
										<Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive">
											<Trash2 className="h-4 w-4" />
										</Button>
									}
									title={`${subuser.username ?? subuser.email} を削除しますか?`}
									description="このユーザーはこのサーバーを操作できなくなります。この操作は取り消せません。"
									confirmLabel="削除する"
									onConfirm={() => handleRemove(subuser.uuid)}
								/>
							</div>
						</div>
						<div className="mt-3 flex flex-wrap gap-1.5">
							{subuser.permissions.length === 0 ? (
								<span className="text-xs text-muted-foreground">権限が設定されていません</span>
							) : (
								subuser.permissions.map((permission) => (
									<Badge key={permission} variant="outline" className="font-mono text-[10px]">
										{permission}
									</Badge>
								))
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

interface SubuserFormDialogProps {
	mode: "invite" | "edit";
	initialPermissions?: string[];
	trigger: ReactNode;
	onSubmit: (email: string | null, permissions: string[]) => Promise<void>;
}

function SubuserFormDialog({ mode, initialPermissions, trigger, onSubmit }: SubuserFormDialogProps) {
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [email, setEmail] = useState("");
	const [permissions, setPermissions] = useState<Set<string>>(new Set(initialPermissions ?? []));

	function resetForm() {
		setEmail("");
		setPermissions(new Set(initialPermissions ?? []));
		setError(null);
	}

	function handleOpenChange(next: boolean) {
		if (next) resetForm();
		setOpen(next);
	}

	function togglePermission(value: string) {
		setPermissions((prev) => {
			const next = new Set(prev);
			if (next.has(value)) next.delete(value);
			else next.add(value);
			return next;
		});
	}

	async function handleSubmit() {
		if (mode === "invite" && !email.trim()) {
			setError("メールアドレスを入力してください。");
			return;
		}
		if (permissions.size === 0) {
			setError("少なくとも1つの権限を選択してください。");
			return;
		}
		setPending(true);
		setError(null);
		try {
			await onSubmit(mode === "invite" ? email.trim() : null, Array.from(permissions));
			setOpen(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : "保存に失敗しました。");
		} finally {
			setPending(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent className="max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{mode === "invite" ? "サブユーザーを追加" : "権限を編集"}</DialogTitle>
					<DialogDescription>
						{mode === "invite"
							? "パネルに登録済みのメールアドレスを指定し、このサーバーで許可する操作を選択してください。"
							: "このサブユーザーがこのサーバーで行える操作を選択してください。"}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{mode === "invite" && (
						<div className="space-y-1">
							<label className="text-xs font-medium text-muted-foreground" htmlFor="subuser-email">
								メールアドレス
							</label>
							<input
								id="subuser-email"
								autoFocus
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="user@example.com"
								className={inputClassName}
							/>
						</div>
					)}

					<div className="space-y-3">
						{SUBUSER_PERMISSION_GROUPS.map((group) => (
							<div key={group.category} className="space-y-1.5">
								<p className="text-xs font-medium text-muted-foreground">{group.category}</p>
								<div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
									{group.permissions.map((permission) => (
										<label
											key={permission.value}
											className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 text-xs"
										>
											<input
												type="checkbox"
												checked={permissions.has(permission.value)}
												onChange={() => togglePermission(permission.value)}
												className="h-3.5 w-3.5 rounded border-input"
											/>
											{permission.label}
										</label>
									))}
								</div>
							</div>
						))}
					</div>

					{error && <p className="text-sm text-destructive">{error}</p>}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)}>
						キャンセル
					</Button>
					<Button disabled={pending} onClick={handleSubmit}>
						{pending ? "保存中..." : mode === "invite" ? "追加する" : "保存する"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
