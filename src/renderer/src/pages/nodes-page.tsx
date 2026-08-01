import { Reorder } from "framer-motion";
import { AlertCircle, Loader2, Pencil, Plus, Server } from "lucide-react";
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
import { NodeApiError, fetchNodeHealth } from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";
import type { NodeEntry } from "../../../shared/config-schema";

function AddNodeDialog() {
	const addNode = useNodesStore((s) => s.addNode);
	const navigate = useNavigate();
	const [name, setName] = useState("");
	const [host, setHost] = useState("");
	const [port, setPort] = useState("8443");
	const [open, setOpen] = useState(false);
	const [checking, setChecking] = useState(false);
	const [error, setError] = useState<string | null>(null);

	function reset() {
		setName("");
		setHost("");
		setPort("8443");
		setError(null);
	}

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		setError(null);
		setChecking(true);
		try {
			const address = { host, port: Number(port) };
			await fetchNodeHealth(address);
			const created = await addNode({ name, ...address });
			reset();
			setOpen(false);
			navigate(`/nodes/${created.id}/overview`);
		} catch (err) {
			setError(err instanceof NodeApiError ? err.message : "接続確認中に予期しないエラーが発生しました。");
		} finally {
			setChecking(false);
		}
	}

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
					<DialogTitle>ノードを追加</DialogTitle>
				</DialogHeader>
				<form className="flex flex-col gap-3" onSubmit={handleSubmit}>
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

	function resetFromNode() {
		setName(node.name);
		setHost(node.host);
		setPort(String(node.port));
		setApiInstallPath(node.apiInstallPath ?? "");
		setError(null);
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
				<form className="flex flex-col gap-3" onSubmit={handleSubmit}>
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
							<CardContent className="flex items-center justify-between">
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
							</CardContent>
						</Card>
					</Reorder.Item>
				))}
			</Reorder.Group>
		</div>
	);
}
