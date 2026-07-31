import { useEffect, useRef, useState } from "react";
import { buildProcessManagerConsoleUrl, type NodeAddress } from "@renderer/lib/node-api-client";

const MAX_LINES = 1000;
const RECONNECT_DELAY_MS = 3000;

export type ProcessManagerConsoleStatus = "connecting" | "open" | "closed";

/**
 * process-managerのWebSocketコンソール(/process-manager/projects/:id/console)を購読する。
 * 接続直後にサーバー側のログバッファ(直近最大1000行)が丸ごと届くため、
 * それ以降に届いた行を追記していくだけでよい。切断時は一定間隔で自動再接続する。
 */
export function useProcessManagerConsole(
	node: NodeAddress | undefined,
	token: string | undefined,
	projectId: string | undefined,
): { lines: string[]; status: ProcessManagerConsoleStatus } {
	const [lines, setLines] = useState<string[]>([]);
	const [status, setStatus] = useState<ProcessManagerConsoleStatus>("connecting");

	const linesRef = useRef<string[]>([]);
	linesRef.current = lines;

	useEffect(() => {
		if (!node || !token || !projectId) return;

		let cancelled = false;
		let socket: WebSocket | null = null;
		let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

		setLines([]);
		linesRef.current = [];

		function connect() {
			if (cancelled) return;
			setStatus("connecting");
			socket = new WebSocket(buildProcessManagerConsoleUrl(node!, token!, projectId!));

			socket.onopen = () => {
				if (!cancelled) setStatus("open");
			};

			socket.onmessage = (event) => {
				if (cancelled) return;
				const next = [...linesRef.current, String(event.data)];
				if (next.length > MAX_LINES) next.splice(0, next.length - MAX_LINES);
				linesRef.current = next;
				setLines(next);
			};

			socket.onclose = () => {
				if (cancelled) return;
				setStatus("closed");
				reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
			};

			socket.onerror = () => {
				socket?.close();
			};
		}

		connect();

		return () => {
			cancelled = true;
			if (reconnectTimer) clearTimeout(reconnectTimer);
			socket?.close();
		};
	}, [node?.host, node?.port, token, projectId]);

	return { lines, status };
}
