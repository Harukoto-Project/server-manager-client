import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ShieldCheck, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { ConfirmDestructiveDialog } from "@renderer/components/common/confirm-destructive-dialog";
import { EntityList, EntityListItem } from "@renderer/components/common/entity-list";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Badge } from "@renderer/components/ui/badge";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
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
import { NodeApiError, authorizedFetch, fetchSystemSettingsUfwStatus } from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";

interface UfwRule {
	number: number;
	to: string;
	action: string;
	from: string;
}

interface ParsedUfwStatus {
	active: boolean;
	rules: UfwRule[];
}

function parseUfwStatus(raw: string): ParsedUfwStatus {
	const active = /^Status:\s*active/im.test(raw);
	const rules: UfwRule[] = [];
	for (const line of raw.split("\n")) {
		const match = line.match(/^\[\s*(\d+)\]\s+(.*)$/);
		if (!match) continue;
		const parts = match[2]
			.trim()
			.split(/\s{2,}/)
			.map((part) => part.trim())
			.filter(Boolean);
		if (parts.length < 3) continue;
		rules.push({ number: Number(match[1]), to: parts[0], action: parts[1], from: parts[2] });
	}
	return { active, rules };
}

const inputClassName = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";

interface AddRuleDialogProps {
	trigger: React.ReactNode;
	onAdd: (action: "allow" | "deny", rule: string) => Promise<void>;
}

function AddRuleDialog({ trigger, onAdd }: AddRuleDialogProps) {
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [action, setAction] = useState<"allow" | "deny">("allow");
	const [port, setPort] = useState("");
	const [protocol, setProtocol] = useState<"any" | "tcp" | "udp">("tcp");
	const [sourceIp, setSourceIp] = useState("");

	function resetForm() {
		setAction("allow");
		setPort("");
		setProtocol("tcp");
		setSourceIp("");
		setError(null);
	}

	function handleOpenChange(next: boolean) {
		if (next) resetForm();
		setOpen(next);
	}

	async function handleSubmit() {
		if (!port.trim()) {
			setError("ポート番号は必須です。");
			return;
		}
		const portWithProtocol = protocol === "any" ? port.trim() : `${port.trim()}/${protocol}`;
		const rule = sourceIp.trim()
			? `from ${sourceIp.trim()} to any port ${port.trim()}${protocol === "any" ? "" : ` proto ${protocol}`}`
			: portWithProtocol;

		setPending(true);
		setError(null);
		try {
			await onAdd(action, rule);
			setOpen(false);
		} catch (err) {
			setError(err instanceof NodeApiError ? err.message : "ルールの追加に失敗しました。");
		} finally {
			setPending(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>ファイアウォールルールを追加</DialogTitle>
					<DialogDescription>
						指定したポート(・送信元)への接続を許可(allow)または拒否(deny)します。SSH接続用の22番ポートを誤って拒否しないよう注意してください。
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="ufw-action">
							動作
						</label>
						<select
							id="ufw-action"
							value={action}
							onChange={(e) => setAction(e.target.value as "allow" | "deny")}
							className={inputClassName}
						>
							<option value="allow">許可(allow)</option>
							<option value="deny">拒否(deny)</option>
						</select>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1">
							<label className="text-xs font-medium text-muted-foreground" htmlFor="ufw-port">
								ポート番号
							</label>
							<input
								id="ufw-port"
								value={port}
								onChange={(e) => setPort(e.target.value)}
								placeholder="22"
								className={`${inputClassName} font-mono`}
							/>
						</div>
						<div className="space-y-1">
							<label className="text-xs font-medium text-muted-foreground" htmlFor="ufw-protocol">
								プロトコル
							</label>
							<select
								id="ufw-protocol"
								value={protocol}
								onChange={(e) => setProtocol(e.target.value as "any" | "tcp" | "udp")}
								className={inputClassName}
							>
								<option value="tcp">TCP</option>
								<option value="udp">UDP</option>
								<option value="any">指定なし</option>
							</select>
						</div>
					</div>

					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="ufw-source">
							送信元IP(任意・未入力なら全ての送信元)
						</label>
						<input
							id="ufw-source"
							value={sourceIp}
							onChange={(e) => setSourceIp(e.target.value)}
							placeholder="192.168.1.0/24"
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
						{pending ? "追加中..." : "追加する"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function FirewallPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();

	const [actionError, setActionError] = useState<string | null>(null);

	const ready = Boolean(node && token);

	const statusQuery = useQuery({
		queryKey: ["system-settings-ufw-status", nodeId],
		queryFn: () => fetchSystemSettingsUfwStatus(node!, token!),
		enabled: ready,
		refetchInterval: 8000,
		retry: 1,
	});

	const parsed = useMemo(() => (statusQuery.data ? parseUfwStatus(statusQuery.data) : null), [statusQuery.data]);

	async function refresh() {
		await queryClient.invalidateQueries({ queryKey: ["system-settings-ufw-status", nodeId] });
	}

	async function handleAddRule(action: "allow" | "deny", rule: string) {
		if (!node || !token) return;
		await authorizedFetch(node, token, "/system-settings/ufw/rule", {
			method: "POST",
			body: { action, rule },
		});
		await refresh();
	}

	async function handleDeleteRule(rule: string) {
		if (!node || !token) return;
		setActionError(null);
		try {
			await authorizedFetch(node, token, "/system-settings/ufw/rule", {
				method: "POST",
				body: { action: "delete", rule },
			});
			await refresh();
		} catch (error) {
			setActionError(error instanceof NodeApiError ? error.message : "ルールの削除に失敗しました。");
		}
	}

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || statusQuery.isLoading) statusMessage = "接続中...";
	else if (statusQuery.isError)
		statusMessage = statusQuery.error instanceof NodeApiError ? statusQuery.error.message : "ノードに接続できませんでした。";

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/system-settings`}
			backLabel="設定一覧に戻る"
			title="ファイアウォール"
			description="UFW(Uncomplicated Firewall)のルールを確認・追加・削除します。"
			actions={<AddRuleDialog trigger={<Button size="sm">ルールを追加</Button>} onAdd={handleAddRule} />}
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}
			{actionError && <p className="mb-4 text-sm text-destructive">{actionError}</p>}

			<Card className="mb-4 border-amber-500/40 bg-amber-500/5">
				<CardContent className="flex items-start gap-3 py-4">
					<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
					<p className="text-xs text-muted-foreground">
						現在SSHで接続しているポート(通常22/tcp)を拒否(deny)・削除すると、このサーバーへ再接続できなくなる可能性があります。変更前に接続経路を確認してください。
					</p>
				</CardContent>
			</Card>

			{parsed && (
				<Card className="mb-4">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-sm">
							<ShieldCheck className="h-4 w-4" />
							UFWステータス: {parsed.active ? "有効" : "無効"}
						</CardTitle>
					</CardHeader>
				</Card>
			)}

			{parsed && parsed.rules.length === 0 && (
				<Card>
					<CardContent className="py-6 text-sm text-muted-foreground">登録されているルールはありません。</CardContent>
				</Card>
			)}

			{parsed && parsed.rules.length > 0 && (
				<EntityList>
					{parsed.rules.map((rule) => (
						<EntityListItem
							key={rule.number}
							icon={ShieldCheck}
							title={rule.to}
							subtitle={`From: ${rule.from}`}
							meta={`#${rule.number}`}
							badge={
								<div className="flex items-center gap-2">
									<Badge variant={rule.action.startsWith("ALLOW") ? "success" : "destructive"}>{rule.action}</Badge>
									<ConfirmDestructiveDialog
										trigger={
											<Button size="icon" variant="ghost" className="h-7 w-7">
												<Trash2 className="h-3.5 w-3.5" />
											</Button>
										}
										title={`ルール「${rule.to}」を削除しますか?`}
										description="このルールを削除すると、該当する通信の許可/拒否設定が解除されます。SSH接続用のポートでないことを確認してください。"
										confirmLabel="削除する"
										onConfirm={() => handleDeleteRule(rule.to)}
									/>
								</div>
							}
						/>
					))}
				</EntityList>
			)}
		</DashboardPageLayout>
	);
}
