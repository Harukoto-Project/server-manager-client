import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Network, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
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
	createPterodactylAllocations,
	fetchPterodactylAllocations,
	removePterodactylAllocation,
} from "@renderer/lib/api/game-servers/allocations";
import { fetchPterodactylNodes } from "@renderer/lib/api/game-servers/nodes";
import { NodeApiError } from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";

const inputClassName = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";

interface AddAllocationDialogProps {
	trigger: React.ReactNode;
	onAdd: (ip: string, ports: string[], alias: string) => Promise<void>;
}

function AddAllocationDialog({ trigger, onAdd }: AddAllocationDialogProps) {
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [ip, setIp] = useState("");
	const [ports, setPorts] = useState("");
	const [alias, setAlias] = useState("");

	function resetForm() {
		setIp("");
		setPorts("");
		setAlias("");
		setError(null);
	}

	function handleOpenChange(next: boolean) {
		if (next) resetForm();
		setOpen(next);
	}

	async function handleSubmit() {
		const portList = ports
			.split(",")
			.map((p) => p.trim())
			.filter((p) => p.length > 0);
		if (!ip.trim() || portList.length === 0) {
			setError("IPアドレスとポート(範囲)は必須です。");
			return;
		}
		setPending(true);
		setError(null);
		try {
			await onAdd(ip.trim(), portList, alias.trim());
			setOpen(false);
		} catch (err) {
			setError(err instanceof NodeApiError ? err.message : "アロケーションの追加に失敗しました。");
		} finally {
			setPending(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>アロケーションを追加</DialogTitle>
					<DialogDescription>
						このノードに新しいIPアドレス/ポートの組み合わせを追加します。ポートはカンマ区切りで複数指定でき、
						「25565-25570」のような範囲指定も可能です。
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="allocation-ip">
							IPアドレス
						</label>
						<input
							id="allocation-ip"
							autoFocus
							value={ip}
							onChange={(e) => setIp(e.target.value)}
							placeholder="0.0.0.0"
							className={`${inputClassName} font-mono`}
						/>
					</div>
					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="allocation-ports">
							ポート(カンマ区切り、範囲指定可)
						</label>
						<input
							id="allocation-ports"
							value={ports}
							onChange={(e) => setPorts(e.target.value)}
							placeholder="25565, 25570-25580"
							className={`${inputClassName} font-mono`}
						/>
					</div>
					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="allocation-alias">
							エイリアス(任意、表示名)
						</label>
						<input
							id="allocation-alias"
							value={alias}
							onChange={(e) => setAlias(e.target.value)}
							placeholder="mc.example.com"
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

/** アロケーション管理ページ。Pterodactylノードを選択し、そのノードのIP/ポート割り当てを一覧・追加・削除する */
export function AllocationsPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();
	const [actionError, setActionError] = useState<string | null>(null);
	const [selectedPterodactylNodeId, setSelectedPterodactylNodeId] = useState<number | null>(null);

	const ready = Boolean(node && token);

	const nodesQuery = useQuery({
		queryKey: ["game-servers-admin-nodes", nodeId],
		queryFn: () => fetchPterodactylNodes(node!, token!),
		enabled: ready,
		retry: 1,
	});

	useEffect(() => {
		if (selectedPterodactylNodeId === null && nodesQuery.data && nodesQuery.data.length > 0) {
			setSelectedPterodactylNodeId(nodesQuery.data[0].id);
		}
	}, [nodesQuery.data, selectedPterodactylNodeId]);

	const allocationsQuery = useQuery({
		queryKey: ["game-servers-admin-allocations", nodeId, selectedPterodactylNodeId],
		queryFn: () => fetchPterodactylAllocations(node!, token!, selectedPterodactylNodeId!),
		enabled: ready && selectedPterodactylNodeId !== null,
		retry: 1,
	});

	async function refresh() {
		await queryClient.invalidateQueries({
			queryKey: ["game-servers-admin-allocations", nodeId, selectedPterodactylNodeId],
		});
	}

	async function handleAdd(ip: string, ports: string[], alias: string) {
		if (!node || !token || selectedPterodactylNodeId === null) return;
		await createPterodactylAllocations(node, token, selectedPterodactylNodeId, {
			ip,
			ports,
			...(alias ? { alias } : {}),
		});
		await refresh();
	}

	async function handleDelete(allocationId: number) {
		if (!node || !token || selectedPterodactylNodeId === null) return;
		setActionError(null);
		try {
			await removePterodactylAllocation(node, token, selectedPterodactylNodeId, allocationId);
			await refresh();
		} catch (error) {
			setActionError(
				error instanceof NodeApiError
					? error.message
					: "アロケーションの削除に失敗しました。サーバーに割り当て済みの場合は削除できません。",
			);
		}
	}

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || nodesQuery.isLoading) statusMessage = "接続中...";
	else if (nodesQuery.isError)
		statusMessage = nodesQuery.error instanceof NodeApiError ? nodesQuery.error.message : "ノードに接続できませんでした。";
	else if (ready && nodesQuery.data?.length === 0) statusMessage = "登録済みのPterodactylノードがありません。";

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/game-servers/admin`}
			backLabel="管理者機能一覧に戻る"
			title="アロケーション管理"
			description="各Pterodactylノードに割り当てるIPアドレス/ポートの一覧・追加・削除を行います。"
			actions={
				<AddAllocationDialog
					trigger={
						<Button size="sm" disabled={!ready || selectedPterodactylNodeId === null}>
							<Plus className="h-4 w-4" /> アロケーションを追加
						</Button>
					}
					onAdd={handleAdd}
				/>
			}
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}
			{actionError && <p className="mb-4 text-sm text-destructive">{actionError}</p>}

			{nodesQuery.data && nodesQuery.data.length > 0 && (
				<div className="mb-4 space-y-1">
					<label className="text-xs font-medium text-muted-foreground" htmlFor="allocation-node-select">
						対象ノード
					</label>
					<select
						id="allocation-node-select"
						value={selectedPterodactylNodeId ?? ""}
						onChange={(e) => setSelectedPterodactylNodeId(Number(e.target.value))}
						className={inputClassName}
					>
						{nodesQuery.data.map((n) => (
							<option key={n.id} value={n.id}>
								{n.name}({n.fqdn})
							</option>
						))}
					</select>
				</div>
			)}

			{allocationsQuery.isLoading && selectedPterodactylNodeId !== null && (
				<p className="mb-4 text-sm text-muted-foreground">アロケーションを読み込み中...</p>
			)}
			{allocationsQuery.isError && (
				<p className="mb-4 text-sm text-destructive">
					{allocationsQuery.error instanceof NodeApiError
						? allocationsQuery.error.message
						: "アロケーションを取得できませんでした。"}
				</p>
			)}
			{allocationsQuery.data && allocationsQuery.data.length === 0 && (
				<p className="mb-4 text-sm text-muted-foreground">このノードにはアロケーションが登録されていません。</p>
			)}

			{allocationsQuery.data && allocationsQuery.data.length > 0 && (
				<EntityList>
					{allocationsQuery.data.map((allocation) => (
						<EntityListItem
							key={allocation.id}
							icon={Network}
							title={
								<span className="font-mono">
									{allocation.ip}:{allocation.port}
								</span>
							}
							subtitle={allocation.ipAlias ?? undefined}
							meta={allocation.notes ?? undefined}
							badge={
								<div className="flex items-center gap-1.5">
									<Badge variant={allocation.assigned ? "secondary" : "outline"}>
										{allocation.assigned ? "割当済み" : "未割当"}
									</Badge>
									{!allocation.assigned && (
										<ConfirmDestructiveDialog
											trigger={
												<Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive">
													<Trash2 className="h-4 w-4" />
												</Button>
											}
											title={`${allocation.ip}:${allocation.port} を削除しますか?`}
											description="このアロケーションを削除します。この操作は取り消せません。"
											confirmLabel="削除する"
											onConfirm={() => handleDelete(allocation.id)}
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
