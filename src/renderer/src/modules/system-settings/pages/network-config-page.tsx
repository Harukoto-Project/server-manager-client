import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { ConfirmDestructiveDialog } from "@renderer/components/common/confirm-destructive-dialog";
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
import {
	fetchDnsServers,
	fetchInterfacesConfig,
	updateDnsServers,
} from "@renderer/lib/api/system-settings/network-config";
import { NodeApiError } from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";

const inputClassName = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";

interface EditDnsServersDialogProps {
	trigger: React.ReactNode;
	initialServers: string[];
	onApply: (servers: string[]) => Promise<void>;
}

function EditDnsServersDialog({ trigger, initialServers, onApply }: EditDnsServersDialogProps) {
	const [open, setOpen] = useState(false);
	const [value, setValue] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	function handleOpenChange(next: boolean) {
		if (next) {
			setValue(initialServers.join("\n"));
			setError(null);
		}
		setOpen(next);
	}

	const parsedServers = value
		.split(/[\s,]+/)
		.map((server) => server.trim())
		.filter(Boolean);

	async function handleApply() {
		setPending(true);
		setError(null);
		try {
			await onApply(parsedServers);
			setOpen(false);
		} catch (err) {
			setError(err instanceof NodeApiError ? err.message : "DNSサーバー設定の変更に失敗しました。");
			throw err;
		} finally {
			setPending(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>DNSサーバーを変更</DialogTitle>
					<DialogDescription>
						問い合わせ先のDNSサーバーのIPアドレスを1行(または区切り文字)に1つずつ入力してください。設定を誤ると名前解決ができなくなる可能性があります。
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="dns-servers-input">
							DNSサーバー(IPアドレス)
						</label>
						<textarea
							id="dns-servers-input"
							value={value}
							onChange={(e) => setValue(e.target.value)}
							placeholder={"1.1.1.1\n8.8.8.8"}
							rows={4}
							className={`${inputClassName} font-mono`}
						/>
					</div>

					{error && <p className="text-sm text-destructive">{error}</p>}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)}>
						キャンセル
					</Button>
					<ConfirmDestructiveDialog
						trigger={
							<Button variant="destructive" disabled={pending || parsedServers.length === 0}>
								{pending ? "適用中..." : "適用する"}
							</Button>
						}
						title="DNSサーバー設定を変更しますか?"
						description="DNSサーバーの設定を誤ると、このサーバー上の名前解決が行えなくなる可能性があります。入力内容をよく確認してから実行してください。"
						confirmLabel="適用する"
						onConfirm={handleApply}
					/>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function NetworkConfigPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);
	const queryClient = useQueryClient();

	const [actionError, setActionError] = useState<string | null>(null);

	const ready = Boolean(node && token);

	const dnsQuery = useQuery({
		queryKey: ["system-settings-network-config-dns", nodeId],
		queryFn: () => fetchDnsServers(node!, token!),
		enabled: ready,
		retry: 1,
	});

	const interfacesConfigQuery = useQuery({
		queryKey: ["system-settings-network-config-interfaces", nodeId],
		queryFn: () => fetchInterfacesConfig(node!, token!),
		enabled: ready,
		retry: 1,
	});

	async function handleApplyDnsServers(servers: string[]) {
		if (!node || !token) return;
		setActionError(null);
		try {
			await updateDnsServers(node, token, servers);
			await queryClient.invalidateQueries({ queryKey: ["system-settings-network-config-dns", nodeId] });
		} catch (error) {
			setActionError(error instanceof NodeApiError ? error.message : "DNSサーバー設定の変更に失敗しました。");
			throw error;
		}
	}

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading || dnsQuery.isLoading) statusMessage = "接続中...";
	else if (dnsQuery.isError)
		statusMessage = dnsQuery.error instanceof NodeApiError ? dnsQuery.error.message : "ノードに接続できませんでした。";

	const dns = dnsQuery.data;
	const interfacesConfig = interfacesConfigQuery.data;

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/system-settings`}
			backLabel="設定一覧に戻る"
			title="ネットワーク設定の変更"
			description="DNSサーバーの設定変更と、現在のインターフェース設定の確認を行います。"
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}
			{actionError && <p className="mb-4 text-sm text-destructive">{actionError}</p>}

			<Card className="mb-4 border-amber-500/40 bg-amber-500/5">
				<CardContent className="flex items-start gap-3 py-4">
					<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
					<p className="text-xs text-muted-foreground">
						ネットワーク設定はサーバーへの接続そのものに関わります。DNSサーバーの変更内容は実行前に必ず確認してください。IPアドレスやゲートウェイの変更は接続断のリスクが高いため、このページでは閲覧専用としています。
					</p>
				</CardContent>
			</Card>

			<Card className="mb-4">
				<CardHeader className="flex flex-row items-center justify-between gap-4">
					<CardTitle className="text-sm">DNSサーバー</CardTitle>
					<EditDnsServersDialog
						trigger={
							<Button size="sm" disabled={!ready}>
								変更する
							</Button>
						}
						initialServers={dns?.servers ?? []}
						onApply={handleApplyDnsServers}
					/>
				</CardHeader>
				<CardContent className="space-y-3">
					{dns && (
						<>
							<p className="text-xs text-muted-foreground">
								設定方式:{" "}
								{dns.source === "systemd-resolved"
									? "systemd-resolved"
									: dns.source === "resolv.conf"
										? "/etc/resolv.conf"
										: "不明"}
							</p>
							{dns.servers.length > 0 ? (
								<div className="flex flex-wrap gap-2">
									{dns.servers.map((server) => (
										<Badge key={server} variant="secondary" className="font-mono">
											{server}
										</Badge>
									))}
								</div>
							) : (
								<p className="text-sm text-muted-foreground">DNSサーバーの情報を取得できませんでした。</p>
							)}
						</>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-sm">
						<ShieldAlert className="h-4 w-4 text-muted-foreground" />
						現在のインターフェース設定(閲覧専用)
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<p className="text-xs text-muted-foreground">
						IPアドレスの変更はリスクが高いため現時点では読み取り専用です。設定を変更する場合はサーバーに直接ログインして操作してください。
					</p>
					{interfacesConfig && interfacesConfig.files.length > 0 ? (
						<div className="space-y-3">
							{interfacesConfig.files.map((file) => (
								<div key={file.file} className="space-y-1">
									<p className="font-mono text-xs text-muted-foreground">{file.file}</p>
									<pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs">{file.content}</pre>
								</div>
							))}
						</div>
					) : (
						<p className="text-sm text-muted-foreground">設定ファイルを取得できませんでした。</p>
					)}
				</CardContent>
			</Card>
		</DashboardPageLayout>
	);
}
