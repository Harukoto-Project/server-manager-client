import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { buildTerminalSessionUrl, type NodeAddress } from "@renderer/lib/node-api-client";

export type TerminalSessionStatus = "idle" | "connecting" | "authenticating" | "ready" | "closed";

interface ServerMessage {
	type: "auth-success" | "auth-error" | "data" | "exit";
	message?: string;
	data?: string;
}

function isServerMessage(value: unknown): value is ServerMessage {
	return typeof value === "object" && value !== null && typeof (value as { type?: unknown }).type === "string";
}

/**
 * 1つのターミナルタブの実体(xterm.jsのTerminalインスタンス + WebSocket接続)。
 *
 * Reactコンポーネント(TerminalTabSession)ではなく、このクラスのインスタンス自身が
 * useTerminalStore(Zustand)経由でアプリ全体のライフタイムで保持される。そのため、
 * ページ遷移やノード切り替えでReactコンポーネントがアンマウントされても接続・スクロールバックは
 * 維持され、アプリ(Electronプロセス)自体を終了しない限りログイン状態が続く。
 * DOMへの表示は attach() で任意のコンテナへ都度アタッチし直すだけで、破棄はdispose()を呼ぶまで行わない。
 */
export class TerminalRuntime {
	readonly terminal: Terminal;
	private readonly fitAddon: FitAddon;
	private socket: WebSocket | null = null;
	private lastSize = { cols: 80, rows: 24 };
	private readonly listeners = new Set<() => void>();
	private disposed = false;

	status: TerminalSessionStatus = "idle";
	errorMessage: string | undefined;

	constructor(
		private readonly node: NodeAddress,
		private readonly token: string,
		private readonly username: string,
		private readonly password: string,
	) {
		this.terminal = new Terminal({
			cursorBlink: true,
			fontFamily: "'Hack', 'Noto Sans Mono', 'Source Code Pro', monospace",
			fontSize: 13,
			scrollback: 5000,
			theme: {
				background: "#00000000",
				foreground: "#d1fae5",
				cursor: "#34d399",
				selectionBackground: "#34d39944",
			},
		});
		this.fitAddon = new FitAddon();
		this.terminal.loadAddon(this.fitAddon);
		this.terminal.onData((data) => this.sendInput(data));
		this.terminal.onResize(({ cols, rows }) => {
			this.lastSize = { cols, rows };
			this.resize(cols, rows);
		});
		this.connect();
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private notify() {
		for (const listener of this.listeners) listener();
	}

	private setStatus(status: TerminalSessionStatus, errorMessage?: string) {
		this.status = status;
		this.errorMessage = errorMessage;
		this.notify();
	}

	private connect() {
		this.setStatus("connecting");
		const socket = new WebSocket(buildTerminalSessionUrl(this.node, this.token));
		this.socket = socket;

		socket.onopen = () => {
			this.setStatus("authenticating");
			socket.send(
				JSON.stringify({
					type: "auth",
					username: this.username,
					password: this.password,
					cols: this.lastSize.cols,
					rows: this.lastSize.rows,
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
				this.setStatus("ready");
			} else if (message.type === "auth-error") {
				this.setStatus("closed", message.message ?? "ログインに失敗しました。");
				socket.close();
			} else if (message.type === "data" && message.data) {
				this.terminal.write(message.data);
			} else if (message.type === "exit") {
				socket.close();
			}
		};

		socket.onclose = () => {
			if (this.socket === socket) this.socket = null;
			if (this.disposed) return;
			this.setStatus("closed", this.errorMessage ?? (this.status !== "ready" ? "ノードに接続できませんでした。" : undefined));
		};
	}

	/** xterm.jsのDOM要素を指定のコンテナへ(必要な場合のみ)アタッチする。表示先が変わっても再生成はしない */
	attach(container: HTMLElement) {
		if (!this.terminal.element) {
			this.terminal.open(container);
		} else if (this.terminal.element.parentElement !== container) {
			container.appendChild(this.terminal.element);
		}
		this.fitAddon.fit();
	}

	fit() {
		if (this.terminal.element) this.fitAddon.fit();
	}

	focus() {
		this.terminal.focus();
	}

	private sendInput(data: string) {
		if (this.socket?.readyState === WebSocket.OPEN) {
			this.socket.send(JSON.stringify({ type: "input", data }));
		}
	}

	private resize(cols: number, rows: number) {
		if (this.socket?.readyState === WebSocket.OPEN) {
			this.socket.send(JSON.stringify({ type: "resize", cols, rows }));
		}
	}

	/** タブを閉じる/全ログアウトする時にのみ呼ぶ。接続とxterm.jsのDOMを完全に破棄する */
	dispose() {
		this.disposed = true;
		this.socket?.close();
		this.socket = null;
		this.terminal.dispose();
		this.listeners.clear();
	}
}
