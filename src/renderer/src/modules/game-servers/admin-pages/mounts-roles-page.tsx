import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, HardDrive, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { ConfirmDestructiveDialog } from "@renderer/components/common/confirm-destructive-dialog";
import { EntityList, EntityListItem } from "@renderer/components/common/entity-list";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Badge } from "@renderer/components/ui/badge";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent } from "@renderer/components/ui/card";
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
	createPterodactylMount,
	fetchPterodactylMounts,
	fetchPterodactylRoles,
	removePterodactylMount,
} from "@renderer/lib/api/game-servers/mounts-roles";
import { NodeApiError } from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";

const inputClassName = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";

interface AddMountDialogProps {
	trigger: React.ReactNode;
	onAdd: (input: { name: string; description: string; source: string; target: string; readOnly: boolean }) => Promise<void>;
}

function AddMountDialog({ trigger, onAdd }: AddMountDialogProps) {
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [source, setSource] = useState("");
	const [target, setTarget] = useState("");
	const [readOnly, setReadOnly] = useState(false);

	function resetForm() {
		setName("");
		setDescription("");
		setSource("");
		setTarget("");
		setReadOnly(false);
		setError(null);
	}

	function handleOpenChange(next: boolean) {
		if (next) resetForm();
		setOpen(next);
	}

	async function handleSubmit() {
		if (!name.trim() || !source.trim() || !target.trim()) {
			setError("マウント名・ソースパス・ターゲットパスは必須です。");
			return;
		}
		setPending(true);
		setError(null);
		try {
			await onAdd({ name: name.trim(), description: description.trim(), source: source.trim(), target: target.trim(), readOnly });
			setOpen(false);
		} catch (err) {
			setError(err instanceof NodeApiError ? err.message : "マウントの追加に失敗しました。");
		} finally {
			setPending(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>マウントを追加</DialogTitle>
					<DialogDescription>
						サーバーコンテナに追加でマウントできるホスト側ディレクトリを登録します。Eggの設定でマウントを許可しているサーバーでのみ利用できます。
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="mount-name">
							マウント名
						</label>
						<input id="mount-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} className={inputClassName} />
					</div>
					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="mount-description">
							説明(任意)
						</label>
						<input
							id="mount-description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							className={inputClassName}
						/>
					</div>
					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="mount-source">
							ソースパス(ホスト側)
						</label>
						<input
							id="mount-source"
							value={source}
							onChange={(e) => setSource(e.target.value)}
							placeholder="/mnt/shared-data"
							className={`${inputClassName} font-mono`}
						/>
					</div>
					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="mount-target">
							ターゲットパス(コンテナ側)
						</label>
						<input
							id="mount-target"
							value={target}
							onChange={(e) => setTarget(e.target.value)}
							placeholder="/mnt/shared-data"
							className={`${inputClassName} font-mono`}
						/>
					</div>
					<label className="flex items-center gap-2 text-xs text-muted-foreground">
						<input type="checkbox" checked={readOnly} onChange={(e) => setReadOnly(e.target.checked)} />
						読み取り専用としてマウントする
					</label>
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

/**
 * マウント・ロール管理ページ。
 * マウントはサーバーコンテナへの追加ボリューム共有、ロールはパネル管理者アカウントの権限セットを表す。
 * どちらもPterodactylパネルのバージョン/フォークによってはApplication APIが提供されない場合があり、
 * その場合はエラーにせず「利用できない」旨を案内する。
 */
export function MountsRolesPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();
	const [actionError, setActionError] = useState<string | null>(null);

	const ready = Boolean(node && token);

	const mountsQuery = useQuery({
		queryKey: ["game-servers-admin-mounts", nodeId],
		queryFn: () => fetchPterodactylMounts(node!, token!),
		enabled: ready,
		retry: 1,
	});

	const rolesQuery = useQuery({
		queryKey: ["game-servers-admin-roles", nodeId],
		queryFn: () => fetchPterodactylRoles(node!, token!),
		enabled: ready,
		retry: 1,
	});

	async function refreshMounts() {
		await queryClient.invalidateQueries({ queryKey: ["game-servers-admin-mounts", nodeId] });
	}

	async function handleAddMount(input: { name: string; description: string; source: string; target: string; readOnly: boolean }) {
		if (!node || !token) return;
		await createPterodactylMount(node, token, input);
		await refreshMounts();
	}

	async function handleDeleteMount(mountId: number) {
		if (!node || !token) return;
		setActionError(null);
		try {
			await removePterodactylMount(node, token, mountId);
			await refreshMounts();
		} catch (error) {
			setActionError(error instanceof NodeApiError ? error.message : "マウントの削除に失敗しました。");
		}
	}

	let mountsStatusMessage: string | undefined;
	if (!node) mountsStatusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || mountsQuery.isLoading) mountsStatusMessage = "接続中...";
	else if (mountsQuery.isError)
		mountsStatusMessage =
			mountsQuery.error instanceof NodeApiError ? mountsQuery.error.message : "ノードに接続できませんでした。";

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/game-servers/admin`}
			backLabel="管理者機能一覧に戻る"
			title="マウント・ロール管理"
			description="サーバーに追加でマウントできるボリュームと、パネル管理者のロール(権限セット)を管理します。"
			actions={
				<AddMountDialog
					trigger={
						<Button size="sm" disabled={!ready || mountsQuery.data?.available === false}>
							<Plus className="h-4 w-4" /> マウントを追加
						</Button>
					}
					onAdd={handleAddMount}
				/>
			}
		>
			{mountsStatusMessage && <p className="mb-4 text-sm text-muted-foreground">{mountsStatusMessage}</p>}
			{actionError && <p className="mb-4 text-sm text-destructive">{actionError}</p>}

			{mountsQuery.data?.available === false && (
				<Card className="mb-6 border-amber-500/40 bg-amber-500/5">
					<CardContent className="flex items-start gap-3 py-4">
						<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
						<p className="text-xs text-muted-foreground">
							このPterodactylバージョンではマウント管理APIが提供されていません。パネルの管理画面から直接操作してください。
						</p>
					</CardContent>
				</Card>
			)}

			{mountsQuery.data?.available && mountsQuery.data.mounts.length === 0 && (
				<p className="mb-6 text-sm text-muted-foreground">登録済みのマウントはありません。</p>
			)}

			{mountsQuery.data?.available && mountsQuery.data.mounts.length > 0 && (
				<EntityList className="mb-8">
					{mountsQuery.data.mounts.map((mount) => (
						<EntityListItem
							key={mount.id}
							icon={HardDrive}
							title={mount.name}
							subtitle={
								<span className="font-mono">
									{mount.source} → {mount.target}
								</span>
							}
							meta={mount.description ?? undefined}
							badge={
								<div className="flex items-center gap-1.5">
									{mount.readOnly && <Badge variant="secondary">読み取り専用</Badge>}
									<ConfirmDestructiveDialog
										trigger={
											<Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive">
												<Trash2 className="h-4 w-4" />
											</Button>
										}
										title={`「${mount.name}」を削除しますか?`}
										description="このマウントを削除します。このマウントを利用しているサーバーに影響する可能性があります。"
										confirmLabel="削除する"
										onConfirm={() => handleDeleteMount(mount.id)}
									/>
								</div>
							}
						/>
					))}
				</EntityList>
			)}

			<div className="mb-3 mt-8">
				<h2 className="text-sm font-semibold">ロール一覧</h2>
				<p className="text-xs text-muted-foreground">パネル管理者アカウントに割り当てられる権限セットです(閲覧専用)。</p>
			</div>

			{rolesQuery.isLoading && ready && <p className="text-sm text-muted-foreground">読み込み中...</p>}
			{rolesQuery.isError && (
				<p className="text-sm text-destructive">
					{rolesQuery.error instanceof NodeApiError ? rolesQuery.error.message : "ロール情報を取得できませんでした。"}
				</p>
			)}

			{rolesQuery.data?.available === false && (
				<Card className="border-amber-500/40 bg-amber-500/5">
					<CardContent className="flex items-start gap-3 py-4">
						<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
						<p className="text-xs text-muted-foreground">
							このPterodactylバージョンではロール管理APIが提供されていません。
						</p>
					</CardContent>
				</Card>
			)}

			{rolesQuery.data?.available && rolesQuery.data.roles.length === 0 && (
				<p className="text-sm text-muted-foreground">登録済みのロールはありません。</p>
			)}

			{rolesQuery.data?.available && rolesQuery.data.roles.length > 0 && (
				<EntityList>
					{rolesQuery.data.roles.map((role) => (
						<EntityListItem
							key={role.id}
							icon={ShieldCheck}
							title={role.name}
							subtitle={role.description ?? undefined}
							meta={role.permissions.length > 0 ? `${role.permissions.length}件の権限` : undefined}
						/>
					))}
				</EntityList>
			)}
		</DashboardPageLayout>
	);
}
