import { LogOut, Plus, X } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useParams } from "react-router-dom";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Button } from "@renderer/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@renderer/components/ui/tabs";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import { cn } from "@renderer/lib/utils";
import { useNodesStore } from "@renderer/state/nodes-store";
import { useTerminalStore } from "@renderer/state/terminal-store";
import { TerminalLoginForm } from "./terminal-login-form";
import type { TerminalRuntime, TerminalSessionStatus } from "./terminal-runtime";
import { TerminalTabSession } from "./terminal-tab-session";

const STATUS_DOT_CLASS: Record<TerminalSessionStatus, string> = {
	idle: "bg-muted-foreground/40",
	connecting: "bg-amber-500 animate-pulse",
	authenticating: "bg-amber-500 animate-pulse",
	ready: "bg-emerald-500",
	closed: "bg-destructive",
};

/** タブ見出しの接続状態ドット。runtime自身の状態を購読し、タブラベルに反映する */
function TabStatusDot({ runtime }: { runtime: TerminalRuntime }) {
	const status = useSyncExternalStore(
		(listener) => runtime.subscribe(listener),
		() => runtime.status,
	);
	return <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATUS_DOT_CLASS[status])} />;
}

export function TerminalPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);

	// アプリ全体で保持されているストアから、このノードのターミナル状態を読み出す。
	// ページの再訪問やモジュール切り替えでこのコンポーネントが再マウントされても、
	// ストア(とその中のTerminalRuntime = xterm.js + WebSocket)はアプリを終了するまで維持される。
	const nodeState = useTerminalStore((s) => (nodeId ? s.nodeStates[nodeId] : undefined));
	const runtimes = useTerminalStore((s) => s.runtimes);
	const login = useTerminalStore((s) => s.login);
	const addTab = useTerminalStore((s) => s.addTab);
	const closeTab = useTerminalStore((s) => s.closeTab);
	const logoutAll = useTerminalStore((s) => s.logoutAll);
	const setActiveTab = useTerminalStore((s) => s.setActiveTab);

	const tabs = nodeState?.tabs ?? [];
	const activeTabId = nodeState?.activeTabId ?? null;
	const credentials = nodeState?.credentials ?? null;

	const ready = Boolean(node && token);
	const showTerminal = tabs.length > 0;

	function handleLogin(username: string, password: string) {
		if (!nodeId || !node || !token) return;
		login(nodeId, node, token, username, password);
	}

	function handleAddTab() {
		if (!nodeId || !node || !token) return;
		addTab(nodeId, node, token);
	}

	function handleCloseTab(tabId: string) {
		if (!nodeId) return;
		closeTab(nodeId, tabId);
	}

	function handleLogoutAll() {
		if (!nodeId) return;
		logoutAll(nodeId);
	}

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading) statusMessage = "接続中...";

	return (
		<DashboardPageLayout
			fillHeight
			title="ターミナル"
			description={
				showTerminal
					? `${credentials?.username ?? ""}@${node?.host ?? ""} に接続中`
					: "ノード上のLinuxユーザーでログインし、シェル操作を行います。"
			}
			actions={
				showTerminal && (
					<Button size="sm" variant="outline" onClick={handleLogoutAll}>
						<LogOut className="h-4 w-4" /> ログアウト
					</Button>
				)
			}
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}

			{!showTerminal ? (
				<TerminalLoginForm disabled={!ready} onSubmit={handleLogin} />
			) : (
				<Tabs
					value={activeTabId ?? undefined}
					onValueChange={(id) => nodeId && setActiveTab(nodeId, id)}
					className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm"
				>
					{/* Chromeのタブバーを模したヘッダー: 非アクティブタブは背景に沈み、アクティブタブだけが下のコンソールと同じ色で繋がって見える */}
					<div className="flex items-end gap-1 border-b bg-muted/40 px-2 pt-2">
						<TabsList className="no-scrollbar flex h-9 min-w-0 items-end justify-start gap-0.5 overflow-x-auto rounded-none bg-transparent p-0">
							{tabs.map((tab) => {
								const runtime = runtimes.get(tab.id);
								return (
									<TabsTrigger key={tab.id} value={tab.id} asChild>
										<div
											className={cn(
												"group relative flex h-9 w-40 shrink-0 cursor-pointer items-center gap-2 rounded-t-md border border-b-0 border-transparent px-3 text-sm text-muted-foreground transition-colors",
												"hover:bg-background/70 hover:text-foreground",
												"data-[state=active]:-mb-px data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:text-foreground",
											)}
										>
											{runtime && <TabStatusDot runtime={runtime} />}
											<span className="flex-1 truncate">{tab.label}</span>
											<button
												type="button"
												aria-label={`${tab.label}を閉じる`}
												onClick={(event) => {
													event.stopPropagation();
													handleCloseTab(tab.id);
												}}
												className="shrink-0 rounded p-0.5 opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100 group-data-[state=active]:opacity-60"
											>
												<X className="h-3 w-3" />
											</button>
										</div>
									</TabsTrigger>
								);
							})}
						</TabsList>
						<button
							type="button"
							aria-label="新しいタブ"
							onClick={handleAddTab}
							className="mb-1 shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground"
						>
							<Plus className="h-4 w-4" />
						</button>
					</div>

					{tabs.map((tab) => {
						const runtime = runtimes.get(tab.id);
						if (!runtime) return null;
						return (
							<TabsContent
								key={tab.id}
								value={tab.id}
								forceMount
								className={cn("mt-0 min-h-0 flex-1", tab.id !== activeTabId && "hidden")}
							>
								<TerminalTabSession runtime={runtime} active={tab.id === activeTabId} />
							</TabsContent>
						);
					})}
				</Tabs>
			)}
		</DashboardPageLayout>
	);
}
