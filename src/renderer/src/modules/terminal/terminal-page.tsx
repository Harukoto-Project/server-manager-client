import { LogOut, TerminalSquare } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import { useTerminalSession } from "@renderer/hooks/use-terminal-session";
import { useNodesStore } from "@renderer/state/nodes-store";
import { TerminalLoginForm } from "./terminal-login-form";
import { XtermView, type XtermViewHandle } from "./xterm-view";

export function TerminalPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token, isLoading: tokenLoading } = useNodeAccessToken(nodeId);

	const xtermRef = useRef<XtermViewHandle>(null);
	const sizeRef = useRef({ cols: 80, rows: 24 });
	const [loggedInUser, setLoggedInUser] = useState<string | null>(null);

	const handleData = useCallback((data: string) => xtermRef.current?.write(data), []);
	const { status, errorMessage, connect, sendInput, resize, disconnect } = useTerminalSession(
		node,
		token ?? undefined,
		handleData,
	);

	function handleLogin(username: string, password: string) {
		setLoggedInUser(username);
		connect({ username, password, cols: sizeRef.current.cols, rows: sizeRef.current.rows });
	}

	function handleResize(size: { cols: number; rows: number }) {
		sizeRef.current = size;
		if (status === "ready") resize(size.cols, size.rows);
	}

	function handleLogout() {
		disconnect();
		setLoggedInUser(null);
	}

	const ready = Boolean(node && token);
	const isConnecting = status === "connecting" || status === "authenticating";
	const showTerminal = status === "ready" || isConnecting;

	let statusMessage: string | undefined;
	if (!node) statusMessage = "ノード情報が見つかりません。ノード一覧から選び直してください。";
	else if (tokenLoading) statusMessage = "接続中...";

	return (
		<DashboardPageLayout
			title="ターミナル"
			description={
				showTerminal
					? `${loggedInUser ?? ""}@${node?.host ?? ""} に接続中`
					: "ノード上のLinuxユーザーでログインし、ブラウザ内でシェル操作を行います。"
			}
			actions={
				showTerminal && (
					<Button size="sm" variant="outline" onClick={handleLogout}>
						<LogOut className="h-4 w-4" /> ログアウト
					</Button>
				)
			}
		>
			{statusMessage && <p className="mb-4 text-sm text-muted-foreground">{statusMessage}</p>}

			{!showTerminal ? (
				<TerminalLoginForm disabled={!ready} errorMessage={errorMessage} onSubmit={handleLogin} />
			) : (
				<Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-sm">
							<TerminalSquare className="h-4 w-4" />
							{isConnecting ? "接続中..." : "コンソール"}
						</CardTitle>
					</CardHeader>
					<CardContent className="flex min-h-0 flex-1 flex-col pb-6">
						<div className="min-h-0 flex-1 rounded-lg border bg-black/90 p-2">
							<XtermView ref={xtermRef} onData={sendInput} onResize={handleResize} />
						</div>
					</CardContent>
				</Card>
			)}
		</DashboardPageLayout>
	);
}
