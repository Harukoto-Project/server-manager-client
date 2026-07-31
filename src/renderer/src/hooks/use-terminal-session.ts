import { useCallback, useRef, useState } from "react";
import { buildTerminalSessionUrl, type NodeAddress } from "@renderer/lib/node-api-client";

export type TerminalSessionStatus = "idle" | "connecting" | "authenticating" | "ready" | "closed";

interface ConnectInput {
	username: string;
	password: string;
	cols: number;
	rows: number;
}

interface ServerMessage {
	type: "auth-success" | "auth-error" | "data" | "exit";
	message?: string;
	data?: string;
}

function isServerMessage(value: unknown): value is ServerMessage {
	return typeof value === "object" && value !== null && typeof (value as { type?: unknown }).type === "string";
}

/**
 * Webターミナルモジュールの1接続を管理するフック。
 * 接続直後にユーザー名/パスワードを送信してノード自身のsshd(PAM)による認証を行い、
 * 成功後はシェルの入出力をWebSocketで中継する。onDataで受け取った出力はxterm.jsへそのまま書き込む想定。
 */
export function useTerminalSession(
	node: NodeAddress | undefined,
	token: string | undefined,
	onData: (data: string) => void,
) {
	const socketRef = useRef<WebSocket | null>(null);
	const onDataRef = useRef(onData);
	onDataRef.current = onData;

	const [status, setStatus] = useState<TerminalSessionStatus>("idle");
	const [errorMessage, setErrorMessage] = useState<string>();

	const connect = useCallback(
		(input: ConnectInput) => {
			if (!node || !token) return;
			socketRef.current?.close();

			setErrorMessage(undefined);
			setStatus("connecting");

			const socket = new WebSocket(buildTerminalSessionUrl(node, token));
			socketRef.current = socket;

			socket.onopen = () => {
				setStatus("authenticating");
				socket.send(
					JSON.stringify({
						type: "auth",
						username: input.username,
						password: input.password,
						cols: input.cols,
						rows: input.rows,
					}),
				);
			};

			socket.onmessage = (event) => {
				let message: unknown;
				try {
					message = JSON.parse(String(event.data));
				} catch {
					return;
				}
				if (!isServerMessage(message)) return;

				if (message.type === "auth-success") {
					setStatus("ready");
				} else if (message.type === "auth-error") {
					setErrorMessage(message.message ?? "ログインに失敗しました。");
					socket.close();
				} else if (message.type === "data" && message.data) {
					onDataRef.current(message.data);
				} else if (message.type === "exit") {
					socket.close();
				}
			};

			socket.onclose = () => {
				if (socketRef.current === socket) socketRef.current = null;
				setStatus((prev) => {
					if (prev === "connecting") setErrorMessage((msg) => msg ?? "ノードに接続できませんでした。");
					return "closed";
				});
			};
		},
		[node, token],
	);

	const sendInput = useCallback((data: string) => {
		const socket = socketRef.current;
		if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "input", data }));
	}, []);

	const resize = useCallback((cols: number, rows: number) => {
		const socket = socketRef.current;
		if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "resize", cols, rows }));
	}, []);

	const disconnect = useCallback(() => {
		socketRef.current?.close();
		socketRef.current = null;
		setStatus("closed");
	}, []);

	return { status, errorMessage, connect, sendInput, resize, disconnect };
}
