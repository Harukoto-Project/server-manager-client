import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Network, Plus, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { ConfirmDestructiveDialog } from "@renderer/components/common/confirm-destructive-dialog";
import { Badge } from "@renderer/components/ui/badge";
import { Button } from "@renderer/components/ui/button";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import {
	type GameServerAllocation,
	NodeApiError,
	assignAllocation,
	fetchAllocations,
	setAllocationNotes,
	setPrimaryAllocation,
	unassignAllocation,
} from "@renderer/lib/api/game-servers/network";
import { useNodesStore } from "@renderer/state/nodes-store";
import { TabPlaceholder } from "../shared";

const notesInputClassName = "w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs";

/** ネットワーク(アロケーション)タブ。Pterodactyl Client APIの`allocation.*`権限に対応する */
export function NetworkTab() {
	const { nodeId, identifier } = useParams<{ nodeId: string; identifier: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();
	const [actionError, setActionError] = useState<string | null>(null);
	const [pendingId, setPendingId] = useState<number | null>(null);
	const [assigning, setAssigning] = useState(false);
	const [notesDraft, setNotesDraft] = useState<Record<number, string>>({});

	const ready = Boolean(node && token && identifier);

	const allocationsQuery = useQuery({
		queryKey: ["game-server-network", nodeId, identifier],
		queryFn: () => fetchAllocations(node!, token!, identifier!),
		enabled: ready,
		refetchInterval: 15000,
		retry: 1,
	});

	async function refresh() {
		await queryClient.invalidateQueries({ queryKey: ["game-server-network", nodeId, identifier] });
	}

	async function handleAssign() {
		if (!node || !token || !identifier) return;
		setActionError(null);
		setAssigning(true);
		try {
			await assignAllocation(node, token, identifier);
			await refresh();
		} catch (error) {
			setActionError(error instanceof NodeApiError ? error.message : "アロケーションの割り当てに失敗しました。");
		} finally {
			setAssigning(false);
		}
	}

	async function handleSetPrimary(allocationId: number) {
		if (!node || !token || !identifier) return;
		setActionError(null);
		setPendingId(allocationId);
		try {
			await setPrimaryAllocation(node, token, identifier, allocationId);
			await refresh();
		} catch (error) {
			setActionError(error instanceof NodeApiError ? error.message : "プライマリ設定に失敗しました。");
		} finally {
			setPendingId(null);
		}
	}

	async function handleSaveNotes(allocationId: number, notes: string) {
		if (!node || !token || !identifier) return;
		setActionError(null);
		setPendingId(allocationId);
		try {
			await setAllocationNotes(node, token, identifier, allocationId, notes);
			await refresh();
			setNotesDraft((prev) => {
				const next = { ...prev };
				delete next[allocationId];
				return next;
			});
		} catch (error) {
			setActionError(error instanceof NodeApiError ? error.message : "メモの更新に失敗しました。");
		} finally {
			setPendingId(null);
		}
	}

	async function handleUnassign(allocationId: number) {
		if (!node || !token || !identifier) return;
		setActionError(null);
		try {
			await unassignAllocation(node, token, identifier, allocationId);
			await refresh();
		} catch (error) {
			setActionError(error instanceof NodeApiError ? error.message : "割り当て解除に失敗しました。");
		}
	}

	let statusMessage: string | undefined;
	if (!node || !identifier) statusMessage = "サーバー情報を読み込めませんでした。";
	else if (tokenLoading || allocationsQuery.isLoading) statusMessage = "読み込み中...";
	else if (allocationsQuery.isError)
		statusMessage =
			allocationsQuery.error instanceof NodeApiError
				? allocationsQuery.error.message
				: "アロケーションの取得に失敗しました。";
	else if (ready && allocationsQuery.data?.length === 0) statusMessage = "割り当てられているアロケーションはありません。";

	if (!ready && !statusMessage) {
		return <TabPlaceholder title="接続情報を取得できません" description="ノードへの接続情報を確認してください。" />;
	}

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
			<div className="flex items-center justify-between gap-3">
				<p className="text-xs text-muted-foreground">
					このサーバーに割り当てられているIPアドレス/ポートを確認・管理します。
				</p>
				<Button size="sm" disabled={!ready || assigning} onClick={handleAssign}>
					<Plus className="h-4 w-4" /> {assigning ? "割り当て中..." : "アロケーションを追加"}
				</Button>
			</div>

			{statusMessage && <p className="text-sm text-muted-foreground">{statusMessage}</p>}
			{actionError && <p className="text-sm text-destructive">{actionError}</p>}

			<div className="min-h-0 flex-1 overflow-y-auto">
				<div className="space-y-2">
					{allocationsQuery.data?.map((allocation) => (
						<AllocationRow
							key={allocation.id}
							allocation={allocation}
							pending={pendingId === allocation.id}
							draftNotes={notesDraft[allocation.id]}
							onDraftChange={(value) => setNotesDraft((prev) => ({ ...prev, [allocation.id]: value }))}
							onSaveNotes={(notes) => handleSaveNotes(allocation.id, notes)}
							onSetPrimary={() => handleSetPrimary(allocation.id)}
							onUnassign={() => handleUnassign(allocation.id)}
						/>
					))}
				</div>
			</div>
		</div>
	);
}

interface AllocationRowProps {
	allocation: GameServerAllocation;
	pending: boolean;
	draftNotes: string | undefined;
	onDraftChange: (value: string) => void;
	onSaveNotes: (notes: string) => void;
	onSetPrimary: () => void;
	onUnassign: () => void;
}

function AllocationRow({
	allocation,
	pending,
	draftNotes,
	onDraftChange,
	onSaveNotes,
	onSetPrimary,
	onUnassign,
}: AllocationRowProps) {
	const notesValue = draftNotes ?? allocation.notes ?? "";
	const notesChanged = draftNotes !== undefined && draftNotes !== (allocation.notes ?? "");

	return (
		<div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
			<Network className="h-4 w-4 shrink-0 text-muted-foreground" />
			<div className="min-w-0 flex-1 truncate">
			<p className="font-mono text-sm font-medium truncate">
				{allocation.ipAlias ?? allocation.ip}:{allocation.port}
			</p>
				<div className="mt-1.5 flex items-center gap-2">
					<input
						value={notesValue}
						onChange={(e) => onDraftChange(e.target.value)}
						placeholder="メモ(任意)"
						maxLength={200}
						className={notesInputClassName}
					/>
					{notesChanged && (
						<Button size="sm" variant="outline" className="h-7 shrink-0 px-2 text-xs" onClick={() => onSaveNotes(notesValue)}>
							保存
						</Button>
					)}
				</div>
			</div>
			<div className="flex shrink-0 items-center gap-2">
				{allocation.isDefault ? (
					<Badge variant="success">
						<Star className="mr-1 h-3 w-3" /> プライマリ
					</Badge>
				) : (
					<Button size="sm" variant="outline" disabled={pending} onClick={onSetPrimary}>
						<Star className="h-3.5 w-3.5" /> プライマリに設定
					</Button>
				)}
				<ConfirmDestructiveDialog
					trigger={
						<Button
							size="icon"
							variant="ghost"
							className="h-8 w-8 text-destructive hover:text-destructive"
							disabled={allocation.isDefault}
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					}
					title="このアロケーションの割り当てを解除しますか?"
					description={`${allocation.ip}:${allocation.port} をこのサーバーから解除します。プライマリのアロケーションは解除できません。`}
					confirmLabel="解除する"
					onConfirm={onUnassign}
				/>
			</div>
		</div>
	);
}
