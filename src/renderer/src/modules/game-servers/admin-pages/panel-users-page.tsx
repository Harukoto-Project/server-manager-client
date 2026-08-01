import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, ShieldCheck, Trash2, UserRound } from "lucide-react";
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
import {
	type CreatePterodactylPanelUserInput,
	type PterodactylPanelUser,
	createPterodactylPanelUser,
	fetchPterodactylPanelUsers,
	removePterodactylPanelUser,
	updatePterodactylPanelUser,
} from "@renderer/lib/api/game-servers/panel-users";
import { NodeApiError } from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";

const inputClassName = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";

interface PanelUserFormValues {
	email: string;
	username: string;
	firstName: string;
	lastName: string;
	password: string;
}

const EMPTY_FORM: PanelUserFormValues = { email: "", username: "", firstName: "", lastName: "", password: "" };

interface PanelUserFormDialogProps {
	trigger: ReactNode;
	title: string;
	description: string;
	submitLabel: string;
	initialValues?: PanelUserFormValues;
	passwordLabel: string;
	onSubmit: (input: CreatePterodactylPanelUserInput) => Promise<void>;
}

function PanelUserFormDialog({
	trigger,
	title,
	description,
	submitLabel,
	initialValues,
	passwordLabel,
	onSubmit,
}: PanelUserFormDialogProps) {
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [values, setValues] = useState<PanelUserFormValues>(initialValues ?? EMPTY_FORM);

	function handleOpenChange(next: boolean) {
		if (next) {
			setValues(initialValues ?? EMPTY_FORM);
			setError(null);
		}
		setOpen(next);
	}

	function update<K extends keyof PanelUserFormValues>(key: K, value: PanelUserFormValues[K]) {
		setValues((prev) => ({ ...prev, [key]: value }));
	}

	async function handleSubmit() {
		if (!values.email.trim() || !values.username.trim() || !values.firstName.trim() || !values.lastName.trim()) {
			setError("メールアドレス・ユーザー名・氏名は必須です。");
			return;
		}
		if (values.password && values.password.length < 8) {
			setError("パスワードを設定する場合は8文字以上で指定してください。");
			return;
		}
		setPending(true);
		setError(null);
		try {
			await onSubmit({
				email: values.email.trim(),
				username: values.username.trim(),
				firstName: values.firstName.trim(),
				lastName: values.lastName.trim(),
				...(values.password ? { password: values.password } : {}),
			});
			setOpen(false);
		} catch (err) {
			setError(err instanceof NodeApiError ? err.message : "保存に失敗しました。");
		} finally {
			setPending(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1">
							<label className="text-xs font-medium text-muted-foreground" htmlFor="panel-user-first-name">
								名(First name)
							</label>
							<input
								id="panel-user-first-name"
								autoFocus
								value={values.firstName}
								onChange={(e) => update("firstName", e.target.value)}
								className={inputClassName}
							/>
						</div>
						<div className="space-y-1">
							<label className="text-xs font-medium text-muted-foreground" htmlFor="panel-user-last-name">
								姓(Last name)
							</label>
							<input
								id="panel-user-last-name"
								value={values.lastName}
								onChange={(e) => update("lastName", e.target.value)}
								className={inputClassName}
							/>
						</div>
					</div>
					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="panel-user-username">
							ユーザー名
						</label>
						<input
							id="panel-user-username"
							value={values.username}
							onChange={(e) => update("username", e.target.value)}
							className={`${inputClassName} font-mono`}
						/>
					</div>
					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="panel-user-email">
							メールアドレス
						</label>
						<input
							id="panel-user-email"
							type="email"
							value={values.email}
							onChange={(e) => update("email", e.target.value)}
							className={inputClassName}
						/>
					</div>
					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="panel-user-password">
							{passwordLabel}
						</label>
						<input
							id="panel-user-password"
							type="password"
							value={values.password}
							onChange={(e) => update("password", e.target.value)}
							placeholder="空欄の場合は変更しません"
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
						{pending ? "保存中..." : submitLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/**
 * パネルユーザー管理ページ。Pterodactylパネルへのログインアカウント(Application API `users.*`)を管理する。
 * 「システム設定」の「ユーザー・グループ管理」(このサーバー自体のLinuxシステムユーザー)とは全くの別物。
 */
export function PanelUsersPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();
	const [actionError, setActionError] = useState<string | null>(null);

	const ready = Boolean(node && token);

	const usersQuery = useQuery({
		queryKey: ["game-servers-admin-panel-users", nodeId],
		queryFn: () => fetchPterodactylPanelUsers(node!, token!),
		enabled: ready,
		retry: 1,
	});

	async function refresh() {
		await queryClient.invalidateQueries({ queryKey: ["game-servers-admin-panel-users", nodeId] });
	}

	async function handleCreate(input: CreatePterodactylPanelUserInput) {
		if (!node || !token) return;
		await createPterodactylPanelUser(node, token, input);
		await refresh();
	}

	async function handleUpdate(user: PterodactylPanelUser, input: CreatePterodactylPanelUserInput) {
		if (!node || !token) return;
		await updatePterodactylPanelUser(node, token, user.id, input);
		await refresh();
	}

	async function handleDelete(user: PterodactylPanelUser) {
		if (!node || !token) return;
		setActionError(null);
		try {
			await removePterodactylPanelUser(node, token, user.id);
			await refresh();
		} catch (error) {
			setActionError(error instanceof NodeApiError ? error.message : "パネルユーザーの削除に失敗しました。");
		}
	}

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || usersQuery.isLoading) statusMessage = "接続中...";
	else if (usersQuery.isError)
		statusMessage = usersQuery.error instanceof NodeApiError ? usersQuery.error.message : "ノードに接続できませんでした。";
	else if (ready && usersQuery.data?.length === 0) statusMessage = "登録済みのパネルユーザーはいません。";

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/game-servers/admin`}
			backLabel="管理者機能一覧に戻る"
			title="パネルユーザー管理"
			description="Pterodactylパネルへのログインアカウントを管理します。「システム設定」の「ユーザー・グループ管理」(このサーバー自体のLinuxシステムユーザー)とは別物なのでご注意ください。"
			actions={
				<PanelUserFormDialog
					trigger={
						<Button size="sm" disabled={!ready}>
							<Plus className="h-4 w-4" /> パネルユーザーを追加
						</Button>
					}
					title="パネルユーザーを追加"
					description="Pterodactylパネルへの新しいログインアカウントを作成します。"
					submitLabel="作成する"
					passwordLabel="初期パスワード(任意、8文字以上)"
					onSubmit={handleCreate}
				/>
			}
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}
			{actionError && <p className="mb-4 text-sm text-destructive">{actionError}</p>}

			{usersQuery.data && usersQuery.data.length > 0 && (
				<EntityList>
					{usersQuery.data.map((user) => (
						<EntityListItem
							key={user.id}
							icon={UserRound}
							title={user.username}
							subtitle={user.email}
							meta={`${user.firstName} ${user.lastName}`}
							badge={
								<div className="flex items-center gap-1.5">
									{user.isRootAdmin && (
										<Badge variant="secondary" className="flex items-center gap-1">
											<ShieldCheck className="h-3 w-3" /> 管理者
										</Badge>
									)}
									<PanelUserFormDialog
										trigger={
											<Button size="icon" variant="ghost" className="h-8 w-8">
												<Pencil className="h-4 w-4" />
											</Button>
										}
										title={`${user.username} を編集`}
										description="パネルユーザーの情報を更新します。パスワードは空欄のままにすると変更されません。"
										submitLabel="保存する"
										passwordLabel="新しいパスワード(任意、8文字以上)"
										initialValues={{
											email: user.email,
											username: user.username,
											firstName: user.firstName,
											lastName: user.lastName,
											password: "",
										}}
										onSubmit={(input) => handleUpdate(user, input)}
									/>
									<ConfirmDestructiveDialog
										trigger={
											<Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive">
												<Trash2 className="h-4 w-4" />
											</Button>
										}
										title={`${user.username} を削除しますか?`}
										description="このパネルユーザーは完全に削除され、Pterodactylパネルへログインできなくなります。この操作は取り消せません。"
										confirmLabel="削除する"
										onConfirm={() => handleDelete(user)}
									/>
								</div>
							}
						/>
					))}
				</EntityList>
			)}
		</DashboardPageLayout>
	);
}
