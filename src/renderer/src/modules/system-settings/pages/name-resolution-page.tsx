import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookText, Lock, Trash2 } from "lucide-react";
import { useState } from "react";
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
import { addHostsEntry, deleteHostsEntry, fetchHostsEntries } from "@renderer/lib/api/system-settings/name-resolution";
import { NodeApiError } from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";

const inputClassName = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";

interface AddHostEntryDialogProps {
	trigger: React.ReactNode;
	onAdd: (ip: string, hostname: string, comment: string) => Promise<void>;
}

function AddHostEntryDialog({ trigger, onAdd }: AddHostEntryDialogProps) {
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [ip, setIp] = useState("");
	const [hostname, setHostname] = useState("");
	const [comment, setComment] = useState("");

	function resetForm() {
		setIp("");
		setHostname("");
		setComment("");
		setError(null);
	}

	function handleOpenChange(next: boolean) {
		if (next) resetForm();
		setOpen(next);
	}

	async function handleSubmit() {
		if (!ip.trim() || !hostname.trim()) {
			setError("IPアドレスとホスト名は必須です。");
			return;
		}
		setPending(true);
		setError(null);
		try {
			await onAdd(ip.trim(), hostname.trim(), comment.trim());
			setOpen(false);
		} catch (err) {
			setError(err instanceof NodeApiError ? err.message : "エントリの追加に失敗しました。");
		} finally {
			setPending(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>ホストエントリを追加</DialogTitle>
					<DialogDescription>
						IPアドレスとホスト名の対応を`/etc/hosts`に追記します。既存のシステムエントリと重複しないよう注意してください。
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="hosts-ip">
							IPアドレス
						</label>
						<input
							id="hosts-ip"
							autoFocus
							value={ip}
							onChange={(e) => setIp(e.target.value)}
							placeholder="192.168.1.10"
							className={`${inputClassName} font-mono`}
						/>
					</div>

					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="hosts-hostname">
							ホスト名
						</label>
						<input
							id="hosts-hostname"
							value={hostname}
							onChange={(e) => setHostname(e.target.value)}
							placeholder="app.internal"
							className={`${inputClassName} font-mono`}
						/>
					</div>

					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="hosts-comment">
							コメント(任意)
						</label>
						<input
							id="hosts-comment"
							value={comment}
							onChange={(e) => setComment(e.target.value)}
							placeholder="社内サーバー"
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
						{pending ? "追加中..." : "追加する"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function NameResolutionPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();

	const [actionError, setActionError] = useState<string | null>(null);

	const ready = Boolean(node && token);

	const hostsQuery = useQuery({
		queryKey: ["system-settings-name-resolution-hosts", nodeId],
		queryFn: () => fetchHostsEntries(node!, token!),
		enabled: ready,
		retry: 1,
	});

	async function refresh() {
		await queryClient.invalidateQueries({ queryKey: ["system-settings-name-resolution-hosts", nodeId] });
	}

	async function handleAdd(ip: string, hostname: string, comment: string) {
		if (!node || !token) return;
		await addHostsEntry(node, token, { ip, hostname, comment: comment || undefined });
		await refresh();
	}

	async function handleDelete(index: number) {
		if (!node || !token) return;
		setActionError(null);
		try {
			await deleteHostsEntry(node, token, index);
			await refresh();
		} catch (error) {
			setActionError(error instanceof NodeApiError ? error.message : "エントリの削除に失敗しました。");
		}
	}

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || hostsQuery.isLoading) statusMessage = "接続中...";
	else if (hostsQuery.isError)
		statusMessage = hostsQuery.error instanceof NodeApiError ? hostsQuery.error.message : "ノードに接続できませんでした。";
	else if (ready && hostsQuery.data?.length === 0) statusMessage = "登録されているエントリはありません。";

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/system-settings`}
			backLabel="設定一覧に戻る"
			title="名前解決の設定"
			description="`/etc/hosts`に登録されているIPアドレスとホスト名の対応を確認・追加・削除します。"
			actions={
				<AddHostEntryDialog trigger={<Button size="sm" disabled={!ready}>エントリを追加</Button>} onAdd={handleAdd} />
			}
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}
			{actionError && <p className="mb-4 text-sm text-destructive">{actionError}</p>}

			{hostsQuery.data && hostsQuery.data.length > 0 && (
				<EntityList>
					{hostsQuery.data.map((entry) => (
						<EntityListItem
							key={entry.index}
							icon={BookText}
							title={entry.hostnames.join(", ")}
							subtitle={entry.comment ? `${entry.ip} — ${entry.comment}` : entry.ip}
							badge={
								<div className="flex items-center gap-2">
									{entry.isSystemEntry ? (
										<Badge variant="secondary" className="flex items-center gap-1">
											<Lock className="h-3 w-3" /> システム
										</Badge>
									) : (
										<ConfirmDestructiveDialog
											trigger={
												<Button size="icon" variant="ghost" className="h-7 w-7">
													<Trash2 className="h-3.5 w-3.5" />
												</Button>
											}
											title={`「${entry.ip} ${entry.hostnames.join(" ")}」を削除しますか?`}
											description="このエントリを削除すると、対応するホスト名での名前解決ができなくなります。"
											confirmLabel="削除する"
											onConfirm={() => handleDelete(entry.index)}
										/>
									)}
								</div>
							}
						/>
					))}
				</EntityList>
			)}
		</DashboardPageLayout>
	);
}
