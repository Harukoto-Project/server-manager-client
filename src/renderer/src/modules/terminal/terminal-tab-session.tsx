import { useEffect, useRef, useSyncExternalStore } from "react";
import type { TerminalRuntime } from "./terminal-runtime";

interface TerminalTabSessionProps {
	runtime: TerminalRuntime;
	/** タブがアクティブでない間はxterm.jsを非表示にするが、接続自体は維持したまま(runtime側で保持)にする */
	active: boolean;
}

/**
 * 1つのタブの表示部分。実際の接続状態(xterm.js + WebSocket)はTerminalRuntimeが持ち、
 * このコンポーネント自体はマウントごとにコンテナへアタッチするだけの薄いビューとして振る舞う。
 * アンマウントされてもrutimeは破棄しないため、タブを閉じない限り接続とスクロールバックは保持される。
 */
export function TerminalTabSession({ runtime, active }: TerminalTabSessionProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	const status = useSyncExternalStore(
		(listener) => runtime.subscribe(listener),
		() => runtime.status,
	);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		runtime.attach(container);
	}, [runtime]);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		const resizeObserver = new ResizeObserver(() => runtime.fit());
		resizeObserver.observe(container);
		return () => resizeObserver.disconnect();
	}, [runtime]);

	useEffect(() => {
		if (active) {
			runtime.fit();
			runtime.focus();
		}
	}, [active, runtime]);

	return (
		<div className="flex h-full min-h-0 flex-1 flex-col p-3">
			{status === "closed" && runtime.errorMessage && (
				<p className="mb-2 shrink-0 text-sm text-destructive">{runtime.errorMessage}</p>
			)}
			<div
				ref={containerRef}
				className="min-h-0 flex-1 rounded-lg border border-black/20 bg-black/90 p-2 [&_.xterm]:h-full"
			/>
		</div>
	);
}
