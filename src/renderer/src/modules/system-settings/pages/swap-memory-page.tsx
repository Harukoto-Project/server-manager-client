import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MemoryStick, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { ConfirmDestructiveDialog } from "@renderer/components/common/confirm-destructive-dialog";
import { DetailField } from "@renderer/components/common/detail-field";
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
import { createSwapFile, deleteSwapFile, fetchSwapStatus } from "@renderer/lib/api/system-settings/swap-memory";
import { NodeApiError } from "@renderer/lib/node-api-client";
import { formatBytes } from "@renderer/lib/utils";
import { useNodesStore } from "@renderer/state/nodes-store";

const inputClassName = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";

interface CreateSwapDialogProps {
	trigger: React.ReactNode;
	onCreate: (sizeMb: number) => Promise<void>;
}

function CreateSwapDialog({ trigger, onCreate }: CreateSwapDialogProps) {
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [sizeMb, setSizeMb] = useState("1024");

	function handleOpenChange(next: boolean) {
		if (next) {
			setSizeMb("1024");
			setError(null);
		}
		setOpen(next);
	}

	async function handleSubmit() {
		const size = Number(sizeMb);
		if (!Number.isInteger(size) || size <= 0) {
			setError("サイズは正の整数(MB)で指定してください。");
			return;
		}
		setPending(true);
		setError(null);
		try {
			await onCreate(size);
			setOpen(false);
		} catch (err) {
			setError(err instanceof NodeApiError ? err.message : "スワップファイルの作成に失敗しました。");
		} finally {
			setPending(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>スワップファイルを作成</DialogTitle>
					<DialogDescription>
						`/swapfile`を指定サイズで作成し、有効化します。ディスクの空き容量を大きく超えるサイズは指定できません。
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="swap-size">
							サイズ(MB)
						</label>
						<input
							id="swap-size"
							type="number"
							min={1}
							autoFocus
							value={sizeMb}
							onChange={(e) => setSizeMb(e.target.value)}
							className={`${inputClassName} font-mono`}
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

export function SwapMemoryPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();

	const [actionError, setActionError] = useState<string | null>(null);

	const ready = Boolean(node && token);

	const swapQuery = useQuery({
		queryKey: ["system-settings-swap-memory", nodeId],
		queryFn: () => fetchSwapStatus(node!, token!),
		enabled: ready,
		refetchInterval: 10000,
		retry: 1,
	});

	async function refresh() {
		await queryClient.invalidateQueries({ queryKey: ["system-settings-swap-memory", nodeId] });
	}

	async function handleCreate(sizeMb: number) {
		if (!node || !token) return;
		await createSwapFile(node, token, sizeMb);
		await refresh();
	}

	async function handleDelete() {
		if (!node || !token) return;
		setActionError(null);
		try {
			await deleteSwapFile(node, token);
			await refresh();
		} catch (error) {
			setActionError(error instanceof NodeApiError ? error.message : "スワップファイルの削除に失敗しました。");
		}
	}

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || swapQuery.isLoading) statusMessage = "接続中...";
	else if (swapQuery.isError)
		statusMessage = swapQuery.error instanceof NodeApiError ? swapQuery.error.message : "ノードに接続できませんでした。";

	const hasSwap = Boolean(swapQuery.data && swapQuery.data.devices.length > 0);

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/system-settings`}
			backLabel="設定一覧に戻る"
			title="スワップメモリの管理"
			description="メモリ不足時に補助的に使うスワップ領域を確認・作成・削除します。"
			actions={
				hasSwap ? (
					<ConfirmDestructiveDialog
						trigger={
							<Button size="sm" variant="destructive">
								<Trash2 className="h-4 w-4" /> スワップを削除
							</Button>
						}
						title="スワップファイルを削除しますか?"
						description="スワップを無効化してファイルを削除します。メモリ使用量が多い状態で削除すると、プロセスが強制終了される可能性があります。"
						confirmLabel="削除する"
						onConfirm={handleDelete}
					/>
				) : (
					<CreateSwapDialog
						trigger={
							<Button size="sm" disabled={!ready}>
								<Plus className="h-4 w-4" /> スワップを作成
							</Button>
						}
						onCreate={handleCreate}
					/>
				)
			}
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}
			{actionError && <p className="mb-4 text-sm text-destructive">{actionError}</p>}

			{swapQuery.data && (
				<div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
					<DetailField label="合計" value={formatBytes(swapQuery.data.totalBytes)} />
					<DetailField label="使用中" value={formatBytes(swapQuery.data.usedBytes)} />
					<DetailField label="空き" value={formatBytes(swapQuery.data.freeBytes)} />
				</div>
			)}

			{swapQuery.data && swapQuery.data.devices.length === 0 && (
				<p className="text-sm text-muted-foreground">スワップは現在設定されていません。</p>
			)}

			{swapQuery.data && swapQuery.data.devices.length > 0 && (
				<EntityList>
					{swapQuery.data.devices.map((device) => (
						<EntityListItem
							key={device.name}
							icon={MemoryStick}
							title={device.name}
							subtitle={device.type}
							meta={`使用中 ${formatBytes(device.usedBytes)} / ${formatBytes(device.sizeBytes)}`}
						/>
					))}
				</EntityList>
			)}
		</DashboardPageLayout>
	);
}
