import { Reorder } from "framer-motion";
import { AlertCircle, Check, ClipboardCopy, Loader2, Pencil, Plus, Server, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ConfirmDestructiveDialog } from "@renderer/components/common/confirm-destructive-dialog";
import { ThemeToggle } from "@renderer/components/common/theme-toggle";
import { Badge } from "@renderer/components/ui/badge";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@renderer/components/ui/dialog";
import { useNodeHealth } from "@renderer/hooks/use-node-health";
import { useNodeSummary } from "@renderer/hooks/use-node-summary";
import { fetchNodeHealth } from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";
import type { NodeEntry } from "../../../shared/config-schema";

function FingerprintDisplay({ fingerprint }: { fingerprint: string }) {
	const [copied, setCopied] = useState(false);

	function handleCopy() {
		void navigator.clipboard.writeText(fingerprint).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		});
	}

	return (
		<div className="flex items-start gap-2 rounded-md border bg-muted/50 p-3">
			<code className="flex-1 break-all font-mono text-xs leading-relaxed">{fingerprint}</code>
			<button
				type="button"
				onClick={handleCopy}
				className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
				title="コピー"
			>
				{copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
			</button>
		</div>
	);
}

function AddNodeDialog() {
	const addNode = useNodesStore((s) => s.addNode);
	const navigate = useNavigate();
	const [name, setName] = useState("");
	const [host, setHost] = useState("");
	const [port, setPort] = useState("8443");
	const [tlsEnabled, setTlsEnabled] = useState(true);
	const [open, setOpen] = useState(false);
	const [checking, setChecking] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [pendingFingerprint, setPendingFingerprint] = useState<string | null>(null);

	function reset() {
		setName("");
		setHost("");
		setPort("8443");
		setTlsEnabled(true);
		setError(null);
		setPendingFingerprint(null);
	}

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		setError(null);
		setChecking(true);
		try {
			const portNum = Number(port);
			if (tlsEnabled) {
				const fp = await window.api.tls.getFingerprint(host, portNum);
				setPendingFingerprint(fp);
			} else {
				await fetchNodeHealth({ host, port: portNum });
				const created = await addNode({ name, host, port: portNum, tlsEnabled: false });
				reset();
				setOpen(false);
				navigate(`/nodes/${created.id}/overview`);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "接続確認中に予期しないエラーが発生しました。");
		} finally {
			setChecking(false);
		}
	}

	async function handleFingerprintConfirm() {
		if (!pendingFingerprint) return;
		setChecking(true);
		setError(null);
		try {
			const created = await addNode({
				name,
				host,
				port: Number(port),
				tlsEnabled: true,
				certFingerprint: pendingFingerprint,
			});
			reset();
			setOpen(false);
			navigate(`/nodes/${created.id}/overview`);
		} catch {
			setError("ノードの保存中に予期しないエラーが発生しました。");
		} finally {
			setChecking(false);
		}
	}

	const isFingerprintStep = pendingFingerprint !== null;

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (!next) reset();
			}}
		>
			<DialogTrigger asChild>
				<Button>
					<Plus className="h-4 w-4" /> ノードを追加
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{isFingerprintStep ? "証明書フィンガープリントの確認" : "ノードを追加"}
					</DialogTitle>
				</DialogHeader>

				{isFingerprintStep ? (
					<div className="flex flex-col gap-4">
						<p className="text-sm text-muted-foreground">
							接続先サーバーの証明書フィンガープリント (SHA-256) を確認してください。
							<br />
							サーバー管理者が提示したものと一致する場合のみ「信頼して続行」を押してください。
						</p>
						<FingerprintDisplay fingerprint={pendingFingerprint} />
						{error && (
							<div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
								<AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
								<span>{error}</span>
							</div>
						)}
						<DialogFooter className="gap-2 sm:gap-0">
							<Button variant="outline" onClick={() => setPendingFingerprint(null)}>
								キャンセル
							</Button>
							<Button onClick={() => void handleFingerprintConfirm()} disabled={checking}>
								{checking && <Loader2 className="h-4 w-4 animate-spin" />}
								<ShieldCheck className="h-4 w-4" />
								信頼して続行
							</Button>
						</DialogFooter>
					</div>
				) : (
					<form className="flex flex-col gap-3" onSubmit={(e) => void handleSubmit(e)}>
						<label className="flex flex-col gap-1 text-sm">
							名前
							<input
								required
								value={name}
								onChange={(e) => setName(e.target.value)}
								className="rounded-md border border-input bg-background px-3 py-2 text-sm"
								placeholder="例: home-server"
							/>
						</label>
						<label className="flex flex-col gap-1 text-sm">
							ホスト (WireGuard内IP)
							<input
								required
								value={host}
								onChange={(e) => setHost(e.target.value)}
								className="rounded-md border border-input bg-background px-3 py-2 text-sm"
								placeholder="例: 10.10.0.2"
							/>
						</label>
						<label className="flex flex-col gap-1 text-sm">
							ポート
							<input
								required
								value={port}
								onChange={(e) => setPort(e.target.value)}
								className="rounded-md border border-input bg-background px-3 py-2 text-sm"
							/>
						</label>
						<label className="flex cursor-pointer items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={tlsEnabled}
								onChange={(e) => setTlsEnabled(e.target.checked)}
								className="h-4 w-4 rounded border border-input accent-primary"
							/>
							TLS を使用する (HTTPS/WSS)
						</label>
						{!tlsEnabled && (
							<p className="text-xs text-amber-600 dark:text-amber-400">
								TLS なしでは通信が暗号化されません。テスト環境のみで使用してください。
							</p>
						)}
						<p className="text-xs text-muted-foreground">
							疎通確認後、パスキー認証画面に移動します。
						</p>

						{error && (
							<div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
								<AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
								<span>{error}</span>
							</div>
						)}

						<DialogFooter>
							<Button type="submit" disabled={checking}>
								{checking && <Loader2 className="h-4 w-4 animate-spin" />}
								{checking ? "接続を確認中..." : "接続してノードを追加"}
							</Button>
						</DialogFooter>
					</form>
				)}
			</DialogContent>
		</Dialog>
	);
}

function EditNodeDialog({ node }: { node: NodeEntry }) {
	const updateNode = useNodesStore((s) => s.updateNode);
	const [open, setOpen] = useState(false);
	const [name, setName] = useState(node.name);
	const [host, setHost] = useState(node.host);
	const [port, setPort] = useState(String(node.port));
	const [apiInstallPath, setApiInstallPath] = useState(node.apiInstallPath ?? "");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [fingerprintUpdating, setFingerprintUpdating] = useState(false);
	const [pendingNewFingerprint, setPendingNewFingerprint] = useState<string | null>(null);

	function resetFromNode() {
		setName(node.name);
		setHost(node.host);
		setPort(String(node.port));
		setApiInstallPath(node.apiInstallPath ?? "");
		setError(null);
		setPendingNewFingerprint(null);
	}

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		setError(null);
		setSaving(true);
		try {
			await updateNode(node.id, {
				name,
				host,
				port: Number(port),
				apiInstallPath: apiInstallPath.trim() === "" ? undefined : apiInstallPath.trim(),
			});
			setOpen(false);
		} catch {
			setError("保存中に予期しないエラーが発生しました。");
		} finally {
			setSaving(false);
		}
	}

	async function handleFetchNewFingerprint() {
		setFingerprintUpdating(true);
		setError(null);
		try {
			const fp = await window.api.tls.getFingerprint(node.host, node.port);
			setPendingNewFingerprint(fp);
		} catch (err) {
			setError(err instanceof Error ? err.message : "フィンガープリントの取得に失敗しました。");
		} finally {
			setFingerprintUpdating(false);
		}
	}

	async function handleFingerprintUpdate() {
		if (!pendingNewFingerprint) return;
		setSaving(true);
		setError(null);
		try {
			await updateNode(node.id, { certFingerprint: pendingNewFingerprint });
			setPendingNewFingerprint(null);
		} catch {
			setError("フィンガープリントの更新に失敗しました。");
		} finally {
			setSaving(false);
		}
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (!next) resetFromNode();
			}}
		>
			<DialogTrigger asChild>
				<Button size="sm" variant="ghost" onClick={(e) => e.stopPropagation()}>
					<Pencil className="h-4 w-4" /> 編集
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{node.name} を編集</DialogTitle>
				</DialogHeader>
				<form className="flex flex-col gap-3" onSubmit={(e) => void handleSubmit(e)}>
					<label className="flex flex-col gap-1 text-sm">
						名前
						<input
							required
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="rounded-md border border-input bg-background px-3 py-2 text-sm"
						/>
					</label>
					<label className="flex flex-col gap-1 text-sm">
						ホスト (WireGuard内IP)
						<input
							required
							value={host}
							onChange={(e) => setHost(e.target.value)}
							className="rounded-md border border-input bg-background px-3 py-2 text-sm"
						/>
					</label>
					<label className="flex flex-col gap-1 text-sm">
						ポート
						<input
							required
							value={port}
							onChange={(e) => setPort(e.target.value)}
							className="rounded-md border border-input bg-background px-3 py-2 text-sm"
						/>
					</label>
					<label className="flex flex-col gap-1 text-sm">
						APIのインストールパス(任意)
						<input
							value={apiInstallPath}
							onChange={(e) => setApiInstallPath(e.target.value)}
							className="rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
							placeholder="例: /opt/server-manager-api"
						/>
						<span className="text-xs text-muted-foreground">
							サーバー管理APIの自動更新機能で使用します。
						</span>
					</label>

					{node.tlsEnabled && (
						<div className="flex flex-col gap-2 rounded-md border p-3">
							<p className="text-xs font-medium text-muted-foreground">証明書フィンガープリント</p>
							{node.certFingerprint ? (
								<FingerprintDisplay fingerprint={node.certFingerprint} />
							) : (
								<p className="text-xs text-muted-foreground">未設定</p>
							)}
							{pendingNewFingerprint && (
								<>
									<p className="text-xs text-muted-foreground">新しいフィンガープリント:</p>
									<FingerprintDisplay fingerprint={pendingNewFingerprint} />
									<Button
										type="button"
										size="sm"
										onClick={() => void handleFingerprintUpdate()}
										disabled={saving}
									>
										{saving && <Loader2 className="h-3 w-3 animate-spin" />}
										<ShieldCheck className="h-3 w-3" />
										このフィンガープリントに更新する
									</Button>
								</>
							)}
							{!pendingNewFingerprint && (
								<Button
									type="button"
									size="sm"
									variant="outline"
									onClick={() => void handleFetchNewFingerprint()}
									disabled={fingerprintUpdating}
								>
									{fingerprintUpdating && <Loader2 className="h-3 w-3 animate-spin" />}
									証明書フィンガープリントを更新
								</Button>
							)}
						</div>
					)}

					{error && (
						<div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
							<AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
							<span>{error}</span>
						</div>
					)}

					<DialogFooter>
						<Button type="submit" disabled={saving}>
							{saving && <Loader2 className="h-4 w-4 animate-spin" />}
							{saving ? "保存中..." : "保存する"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function NodeStatusBadge({ node }: { node: NodeEntry }) {
	const { isLoading, isError } = useNodeHealth(node);
	if (isLoading) return <Badge variant="secondary">確認中...</Badge>;
	if (isError) return <Badge variant="destructive">未接続</Badge>;
	return <Badge variant="success">接続済み</Badge>;
}

function MiniResourceBar({ percent, label }: { percent: number; label: string }) {
	const clamped = Math.min(100, Math.max(0, percent));
	return (
		<div className="flex-1">
			<div className="flex items-center justify-between text-xs text-muted-foreground">
				<span>{label}</span>
				<span>{percent.toFixed(1)}%</span>
			</div>
			<div className="mt-0.5 h-1 overflow-hidden rounded-full bg-muted">
				<div
					className={`h-full rounded-full transition-all ${clamped >= 90 ? "bg-destructive" : "bg-primary"}`}
					style={{ width: `${clamped}%` }}
				/>
			</div>
		</div>
	);
}

function NodeResourceInfo({ node }: { node: NodeEntry }) {
	const { data } = useNodeSummary(node);
	if (!data) return null;
	return (
		<div className="mt-2 flex gap-3">
			<MiniResourceBar percent={data.cpu.loadPercent} label="CPU" />
			<MiniResourceBar percent={data.memory.usedPercent} label="MEM" />
		</div>
	);
}

export function NodesPage() {
	const navigate = useNavigate();
	const { nodes, loaded, load, removeNode, reorder } = useNodesStore();

	useEffect(() => {
		void load();
	}, [load]);

	return (
		<div className="mx-auto flex h-full max-w-5xl flex-col gap-6 overflow-y-auto px-8 py-10">
			<header className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tightest">ノード一覧</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						登録済みのUbuntuサーバー(ノード)を選択して管理します。
					</p>
				</div>
				<div className="flex items-center gap-2">
					<ThemeToggle />
					<AddNodeDialog />
				</div>
			</header>

			{loaded && nodes.length === 0 && (
				<Card>
					<CardContent className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
						<Server className="h-8 w-8" />
						<p>登録済みのノードがありません。「ノードを追加」から最初のノードを登録してください。</p>
					</CardContent>
				</Card>
			)}

			<Reorder.Group
				axis="y"
				values={nodes}
				onReorder={(reordered) => void reorder(reordered.map((n) => n.id))}
				className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
			>
				{nodes.map((node) => (
					<Reorder.Item
						key={node.id}
						value={node}
						className="cursor-grab active:cursor-grabbing"
						whileDrag={{ scale: 1.03, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}
						transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
					>
						<Card onClick={() => navigate(`/nodes/${node.id}/overview`)}>
							<CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="flex items-center gap-2 text-sm font-medium">
									<Server className="h-4 w-4 text-muted-foreground" />
									{node.name}
								</CardTitle>
								<NodeStatusBadge node={node} />
							</CardHeader>
							<CardContent className="flex flex-col gap-2">
								<div className="flex items-center justify-between">
									<span className="text-xs text-muted-foreground">
										{node.host}:{node.port}
									</span>
									<div className="flex items-center gap-1">
										<EditNodeDialog node={node} />
										<ConfirmDestructiveDialog
											trigger={
												<Button size="sm" variant="ghost" onClick={(e) => e.stopPropagation()}>
													削除
												</Button>
											}
											title={`${node.name} を削除しますか?`}
											description="登録情報とセッショントークンがこのPCから削除されます。ノード側の設定は変更されません。"
											confirmLabel="削除する"
											onConfirm={() => removeNode(node.id)}
										/>
									</div>
								</div>
								<NodeResourceInfo node={node} />
							</CardContent>
						</Card>
					</Reorder.Item>
				))}
			</Reorder.Group>
		</div>
	);
}
