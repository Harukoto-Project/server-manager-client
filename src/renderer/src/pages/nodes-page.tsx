import { Reorder } from "framer-motion";
import { Plus, Server } from "lucide-react";
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
import { useNodesStore } from "@renderer/state/nodes-store";

function AddNodeDialog() {
	const addNode = useNodesStore((s) => s.addNode);
	const [name, setName] = useState("");
	const [host, setHost] = useState("");
	const [port, setPort] = useState("8443");
	const [open, setOpen] = useState(false);

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		await addNode({ name, host, port: Number(port) });
		setName("");
		setHost("");
		setPort("8443");
		setOpen(false);
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
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
					<DialogFooter>
						<Button type="submit">追加してパスキー登録へ</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
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
								<Badge variant="secondary">未接続</Badge>
							</CardHeader>
							<CardContent className="flex items-center justify-between">
								<span className="text-xs text-muted-foreground">
									{node.host}:{node.port}
								</span>
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
							</CardContent>
						</Card>
					</Reorder.Item>
				))}
			</Reorder.Group>
		</div>
	);
}
