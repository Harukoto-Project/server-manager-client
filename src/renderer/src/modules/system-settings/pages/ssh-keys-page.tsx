import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Fingerprint, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ConfirmDestructiveDialog } from "@renderer/components/common/confirm-destructive-dialog";
import { EntityList, EntityListItem } from "@renderer/components/common/entity-list";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
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
import { fetchSystemUsers } from "@renderer/lib/api/system-settings/users-groups";
import { addSshKey, deleteSshKey, fetchSshKeys } from "@renderer/lib/api/system-settings/ssh-keys";
import { NodeApiError } from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";

const selectClassName = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";
const textareaClassName =
	"w-full min-h-[96px] rounded-md border border-input bg-background px-3 py-1.5 font-mono text-xs";

export function SshKeysPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();
	const [selectedUsername, setSelectedUsername] = useState("");
	const [actionError, setActionError] = useState<string | null>(null);

	const ready = Boolean(node && token);

	const usersQuery = useQuery({
		queryKey: ["system-settings-users", nodeId],
		queryFn: () => fetchSystemUsers(node!, token!),
		enabled: ready,
		retry: 1,
	});

	useEffect(() => {
		if (!selectedUsername && usersQuery.data && usersQuery.data.length > 0) {
			setSelectedUsername(usersQuery.data[0].username);
		}
	}, [usersQuery.data, selectedUsername]);

	const keysReady = ready && Boolean(selectedUsername);
	const keysQuery = useQuery({
		queryKey: ["system-settings-ssh-keys", nodeId, selectedUsername],
		queryFn: () => fetchSshKeys(node!, token!, selectedUsername),
		enabled: keysReady,
		retry: 1,
	});

	async function refreshKeys() {
		await queryClient.invalidateQueries({ queryKey: ["system-settings-ssh-keys", nodeId, selectedUsername] });
	}

	async function handleAdd(key: string) {
		if (!node || !token || !selectedUsername) return;
		try {
			await addSshKey(node, token, selectedUsername, key);
			await refreshKeys();
		} catch (error) {
			throw new Error(error instanceof NodeApiError ? error.message : "SSH公開鍵の追加に失敗しました。");
		}
	}

	async function handleDelete(index: number) {
		if (!node || !token || !selectedUsername) return;
		setActionError(null);
		try {
			await deleteSshKey(node, token, selectedUsername, index);
			await refreshKeys();
		} catch (error) {
			setActionError(error instanceof NodeApiError ? error.message : "SSH公開鍵の削除に失敗しました。");
		}
	}

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || usersQuery.isLoading) statusMessage = "接続中...";
	else if (usersQuery.isError)
		statusMessage = usersQuery.error instanceof NodeApiError ? usersQuery.error.message : "ノードに接続できませんでした。";
	else if (ready && usersQuery.data?.length === 0) statusMessage = "選択できるユーザーがいません。";
	else if (keysReady && keysQuery.isError)
		statusMessage = keysQuery.error instanceof NodeApiError ? keysQuery.error.message : "鍵情報の取得に失敗しました。";
	else if (keysReady && keysQuery.data?.length === 0) statusMessage = "登録済みのSSH公開鍵はありません。";

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/system-settings`}
			backLabel="設定一覧に戻る"
			title="SSH公開鍵の管理"
			description="パスワードなしでログインするための公開鍵を、ユーザーごとに管理します。誤って全ての鍵を削除すると、そのユーザーはSSHでログインできなくなる可能性があります。"
			actions={
				<AddSshKeyDialog
					trigger={
						<Button size="sm" disabled={!keysReady}>
							<Plus className="h-4 w-4" /> 公開鍵を追加
						</Button>
					}
					onAdd={handleAdd}
				/>
			}
		>
			<div className="mb-4 max-w-xs space-y-1">
				<label className="text-xs font-medium text-muted-foreground" htmlFor="ssh-keys-username">
					対象ユーザー
				</label>
				<select
					id="ssh-keys-username"
					value={selectedUsername}
					onChange={(e) => setSelectedUsername(e.target.value)}
					className={selectClassName}
					disabled={!usersQuery.data || usersQuery.data.length === 0}
				>
					{(usersQuery.data ?? []).map((user) => (
						<option key={user.username} value={user.username}>
							{user.username}
						</option>
					))}
				</select>
			</div>

			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}
			{actionError && <p className="mb-4 text-sm text-destructive">{actionError}</p>}

			{keysQuery.data && keysQuery.data.length > 0 && (
				<EntityList>
					{keysQuery.data.map((entry) => (
						<EntityListItem
							key={entry.index}
							icon={Fingerprint}
							title={entry.comment || entry.keyType}
							subtitle={`${entry.keyType} ${entry.key.slice(0, 24)}...`}
							badge={
								<ConfirmDestructiveDialog
									trigger={
										<Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive">
											<Trash2 className="h-4 w-4" />
										</Button>
									}
									title="この公開鍵を削除しますか?"
									description="この鍵を使ったSSHログインができなくなります。他にログイン手段(パスワード等)があることを確認してください。"
									confirmLabel="削除する"
									onConfirm={() => handleDelete(entry.index)}
								/>
							}
						/>
					))}
				</EntityList>
			)}
		</DashboardPageLayout>
	);
}

interface AddSshKeyDialogProps {
	trigger: React.ReactNode;
	onAdd: (key: string) => Promise<void>;
}

function AddSshKeyDialog({ trigger, onAdd }: AddSshKeyDialogProps) {
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [key, setKey] = useState("");

	function handleOpenChange(next: boolean) {
		if (next) {
			setKey("");
			setError(null);
		}
		setOpen(next);
	}

	async function handleSubmit() {
		if (!/^(ssh-rsa|ssh-ed25519|ssh-dss|ecdsa-sha2-\S+|sk-ssh-ed25519@openssh\.com|sk-ecdsa-sha2-nistp256@openssh\.com)\s+\S+/.test(
			key.trim(),
		)) {
			setError("有効なSSH公開鍵の形式ではありません(ssh-rsa/ssh-ed25519等で始まる必要があります)。");
			return;
		}
		setPending(true);
		setError(null);
		try {
			await onAdd(key.trim());
			setOpen(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : "SSH公開鍵の追加に失敗しました。");
		} finally {
			setPending(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>SSH公開鍵を追加</DialogTitle>
					<DialogDescription>
						`~/.ssh/authorized_keys` に追記されます。公開鍵(.pub)の内容全体を1行で貼り付けてください。
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="ssh-public-key">
							公開鍵
						</label>
						<textarea
							id="ssh-public-key"
							autoFocus
							value={key}
							onChange={(e) => setKey(e.target.value)}
							placeholder="ssh-ed25519 AAAAC3Nza... user@example"
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
						{pending ? "追加中..." : "追加する"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
