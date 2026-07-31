import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, HardDrive, Lock, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
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
	type BlockDeviceInfo,
	addFstabEntry,
	deleteFstabEntry,
	fetchBlockDevices,
	fetchFstabEntries,
} from "@renderer/lib/api/system-settings/disk-mounts";
import { NodeApiError } from "@renderer/lib/node-api-client";
import { formatBytes } from "@renderer/lib/utils";
import { useNodesStore } from "@renderer/state/nodes-store";

const inputClassName = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";
const PROTECTED_MOUNT_POINTS = new Set(["/", "/boot", "/boot/efi", "/home", "/var", "/usr", "/etc", "/tmp"]);

interface AddFstabDialogProps {
	trigger: React.ReactNode;
	devices: BlockDeviceInfo[];
	onAdd: (device: string, mountPoint: string, fsType: string, options: string) => Promise<void>;
}

function AddFstabDialog({ trigger, devices, onAdd }: AddFstabDialogProps) {
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const mountableDevices = useMemo(
		() => devices.filter((device) => device.type === "part" || device.type === "disk"),
		[devices],
	);

	const [device, setDevice] = useState("");
	const [mountPoint, setMountPoint] = useState("");
	const [fsType, setFsType] = useState("");
	const [options, setOptions] = useState("defaults");

	function resetForm() {
		setDevice("");
		setMountPoint("");
		setFsType("");
		setOptions("defaults");
		setError(null);
	}

	function handleOpenChange(next: boolean) {
		if (next) resetForm();
		setOpen(next);
	}

	function handleDeviceChange(nextPath: string) {
		setDevice(nextPath);
		const matched = mountableDevices.find((d) => d.path === nextPath);
		if (matched?.fsType) setFsType(matched.fsType);
	}

	async function handleConfirm() {
		if (!device || !mountPoint.trim() || !fsType.trim()) {
			setError("デバイス・マウントポイント・ファイルシステム種別は必須です。");
			return;
		}
		const trimmedMountPoint = mountPoint.trim();
		if (!trimmedMountPoint.startsWith("/")) {
			setError("マウントポイントは/から始まる絶対パスで指定してください。");
			return;
		}
		if (PROTECTED_MOUNT_POINTS.has(trimmedMountPoint)) {
			setError(`${trimmedMountPoint} は重要なシステムマウントポイントのため追加できません。`);
			return;
		}
		setPending(true);
		setError(null);
		try {
			await onAdd(device, trimmedMountPoint, fsType.trim(), options.trim() || "defaults");
			setOpen(false);
		} catch (err) {
			setError(err instanceof NodeApiError ? err.message : "マウントエントリの追加に失敗しました。");
		} finally {
			setPending(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>マウントエントリを追加</DialogTitle>
					<DialogDescription>
						/etc/fstabに新しいマウントエントリを追加します。追加後に実際のマウントを検証し、失敗した場合は自動的に取り消されます。
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					<div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
						<div className="flex items-start gap-2">
							<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
							<p className="text-xs text-muted-foreground">
								デバイスやマウントポイントの指定を誤ると、次回起動時にシステムが起動できなくなる可能性があります。内容をよく確認してから追加してください。
							</p>
						</div>
					</div>

					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="fstab-device">
							デバイス
						</label>
						<select
							id="fstab-device"
							autoFocus
							value={device}
							onChange={(e) => handleDeviceChange(e.target.value)}
							className={`${inputClassName} font-mono`}
						>
							<option value="">選択してください</option>
							{mountableDevices.map((d) => (
								<option key={d.path} value={d.path}>
									{d.path} ({formatBytes(d.sizeBytes)}
									{d.label ? ` / ${d.label}` : ""})
								</option>
							))}
						</select>
					</div>

					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="fstab-mountpoint">
							マウントポイント
						</label>
						<input
							id="fstab-mountpoint"
							value={mountPoint}
							onChange={(e) => setMountPoint(e.target.value)}
							placeholder="/mnt/data"
							className={`${inputClassName} font-mono`}
						/>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1">
							<label className="text-xs font-medium text-muted-foreground" htmlFor="fstab-fstype">
								ファイルシステム種別
							</label>
							<input
								id="fstab-fstype"
								value={fsType}
								onChange={(e) => setFsType(e.target.value)}
								placeholder="ext4"
								className={`${inputClassName} font-mono`}
							/>
						</div>
						<div className="space-y-1">
							<label className="text-xs font-medium text-muted-foreground" htmlFor="fstab-options">
								マウントオプション
							</label>
							<input
								id="fstab-options"
								value={options}
								onChange={(e) => setOptions(e.target.value)}
								placeholder="defaults"
								className={`${inputClassName} font-mono`}
							/>
						</div>
					</div>

					{error && <p className="text-sm text-destructive">{error}</p>}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)}>
						キャンセル
					</Button>
					<ConfirmDestructiveDialog
						trigger={<Button disabled={pending}>{pending ? "追加中..." : "追加する"}</Button>}
						title="このマウントエントリを本当に追加しますか?"
						description="デバイスやマウントポイントの指定を誤ると、次回起動時にシステムが起動できなくなる可能性があります。内容を十分に確認したうえで実行してください。"
						confirmLabel="追加する"
						onConfirm={handleConfirm}
					/>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function DiskMountsPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();

	const [actionError, setActionError] = useState<string | null>(null);

	const ready = Boolean(node && token);

	const fstabQuery = useQuery({
		queryKey: ["system-settings-disk-mounts-fstab", nodeId],
		queryFn: () => fetchFstabEntries(node!, token!),
		enabled: ready,
		retry: 1,
	});

	const devicesQuery = useQuery({
		queryKey: ["system-settings-disk-mounts-block-devices", nodeId],
		queryFn: () => fetchBlockDevices(node!, token!),
		enabled: ready,
		retry: 1,
	});

	async function refresh() {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: ["system-settings-disk-mounts-fstab", nodeId] }),
			queryClient.invalidateQueries({ queryKey: ["system-settings-disk-mounts-block-devices", nodeId] }),
		]);
	}

	async function handleAdd(device: string, mountPoint: string, fsType: string, options: string) {
		if (!node || !token) return;
		await addFstabEntry(node, token, { device, mountPoint, fsType, options });
		await refresh();
	}

	async function handleDelete(index: number) {
		if (!node || !token) return;
		setActionError(null);
		try {
			await deleteFstabEntry(node, token, index);
			await refresh();
		} catch (error) {
			setActionError(error instanceof NodeApiError ? error.message : "マウントエントリの削除に失敗しました。");
		}
	}

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || fstabQuery.isLoading) statusMessage = "接続中...";
	else if (fstabQuery.isError)
		statusMessage =
			fstabQuery.error instanceof NodeApiError ? fstabQuery.error.message : "ノードに接続できませんでした。";

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/system-settings`}
			backLabel="設定一覧に戻る"
			title="ディスクのマウント管理"
			description="/etc/fstabのマウントエントリを確認・追加・削除します。起動不能のリスクがあるため操作には十分注意してください。"
			actions={
				<AddFstabDialog
					trigger={
						<Button size="sm" disabled={!ready}>
							<Plus className="h-4 w-4" /> マウントを追加
						</Button>
					}
					devices={devicesQuery.data ?? []}
					onAdd={handleAdd}
				/>
			}
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}
			{actionError && <p className="mb-4 text-sm text-destructive">{actionError}</p>}

			<Card className="mb-4 border-amber-500/40 bg-amber-500/5">
				<CardContent className="flex items-start gap-3 py-4">
					<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
					<p className="text-xs text-muted-foreground">
						「/」「/boot」「/boot/efi」等の重要なマウントポイントは削除できません。設定を誤ると次回起動時にシステムが起動できなくなる可能性があります。
					</p>
				</CardContent>
			</Card>

			{fstabQuery.data && fstabQuery.data.length > 0 && (
				<EntityList>
					{fstabQuery.data.map((entry) => {
						const isProtected = PROTECTED_MOUNT_POINTS.has(entry.mountPoint) || entry.mountPoint === "none";
						return (
							<EntityListItem
								key={entry.index}
								icon={HardDrive}
								title={entry.mountPoint}
								subtitle={<span className="font-mono">{entry.device}</span>}
								meta={entry.fsType}
								badge={
									isProtected ? (
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
											title={`「${entry.mountPoint}」のマウントを削除しますか?`}
											description={`このエントリを削除すると、次回起動時に ${entry.device} が ${entry.mountPoint} にマウントされなくなります。関連するアプリやデータへの影響を確認してください。`}
											confirmLabel="削除する"
											onConfirm={() => handleDelete(entry.index)}
										/>
									)
								}
							/>
						);
					})}
				</EntityList>
			)}
		</DashboardPageLayout>
	);
}
