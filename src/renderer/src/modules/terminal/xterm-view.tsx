import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { cn } from "@renderer/lib/utils";

export interface XtermViewHandle {
	write: (data: string) => void;
	clear: () => void;
	focus: () => void;
}

interface XtermViewProps {
	className?: string;
	onData: (data: string) => void;
	onResize: (size: { cols: number; rows: number }) => void;
}

/**
 * xterm.jsをReactにラップするコンポーネント。
 * スクロールバック・カーソル位置等の状態はxterm.js自身に持たせてReactの再レンダリングと分離し、
 * 親とはwrite()(出力)とonData/onResize(入力・リサイズ通知)経由でのみやり取りする。
 */
export const XtermView = forwardRef<XtermViewHandle, XtermViewProps>(function XtermView(
	{ className, onData, onResize },
	ref,
) {
	const containerRef = useRef<HTMLDivElement>(null);
	const terminalRef = useRef<Terminal | null>(null);

	const onDataRef = useRef(onData);
	onDataRef.current = onData;
	const onResizeRef = useRef(onResize);
	onResizeRef.current = onResize;

	useImperativeHandle(ref, () => ({
		write: (data: string) => terminalRef.current?.write(data),
		clear: () => terminalRef.current?.clear(),
		focus: () => terminalRef.current?.focus(),
	}));

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const terminal = new Terminal({
			cursorBlink: true,
			fontFamily: "'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
			fontSize: 13,
			scrollback: 5000,
			theme: {
				background: "#00000000",
				foreground: "#d1fae5",
				cursor: "#34d399",
				selectionBackground: "#34d39944",
			},
		});
		const fitAddon = new FitAddon();
		terminal.loadAddon(fitAddon);
		terminal.open(container);
		fitAddon.fit();
		terminal.focus();

		terminalRef.current = terminal;

		const dataDisposable = terminal.onData((data) => onDataRef.current(data));
		const resizeDisposable = terminal.onResize(({ cols, rows }) => onResizeRef.current({ cols, rows }));
		onResizeRef.current({ cols: terminal.cols, rows: terminal.rows });

		const resizeObserver = new ResizeObserver(() => fitAddon.fit());
		resizeObserver.observe(container);

		return () => {
			resizeObserver.disconnect();
			dataDisposable.dispose();
			resizeDisposable.dispose();
			terminal.dispose();
			terminalRef.current = null;
		};
	}, []);

	return <div ref={containerRef} className={cn("h-full w-full [&_.xterm]:h-full", className)} />;
});
