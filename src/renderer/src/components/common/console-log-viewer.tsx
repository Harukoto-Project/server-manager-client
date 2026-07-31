import { ArrowDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@renderer/lib/utils";

interface ConsoleLogViewerProps {
	lines: string[];
	className?: string;
	emptyLabel?: string;
}

/**
 * Docker/Minecraft/Node・Pythonの各コンソールで共通利用するログビューア。
 * 自動追従スクロール + ユーザーが上にスクロールしたら追従を止めて
 * 「最新へ」ボタンを表示する(Apple Design適用方針に対応)。
 */
export function ConsoleLogViewer({ lines, className, emptyLabel = "ログはまだありません" }: ConsoleLogViewerProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [following, setFollowing] = useState(true);

	useEffect(() => {
		if (!following || !containerRef.current) return;
		containerRef.current.scrollTop = containerRef.current.scrollHeight;
	}, [lines, following]);

	function handleScroll() {
		const el = containerRef.current;
		if (!el) return;
		const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
		setFollowing(distanceFromBottom < 48);
	}

	function jumpToBottom() {
		const el = containerRef.current;
		if (!el) return;
		el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
		setFollowing(true);
	}

	return (
		<div className={cn("relative rounded-lg border bg-black/90", className)}>
			<div
				ref={containerRef}
				onScroll={handleScroll}
				className="no-scrollbar h-72 overflow-y-auto p-3 font-mono text-xs leading-relaxed text-emerald-300"
			>
				{lines.length === 0 ? (
					<p className="text-muted-foreground/70">{emptyLabel}</p>
				) : (
					lines.map((line, index) => (
						// biome-ignore lint: ログ行は追記のみで安定した識別子がないためindexキーを許容
						<div key={index} className="whitespace-pre-wrap break-all">
							{line}
						</div>
					))
				)}
			</div>

			<AnimatePresence>
				{!following && (
					<motion.button
						type="button"
						onClick={jumpToBottom}
						initial={{ opacity: 0, y: 8, scale: 0.9 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 8, scale: 0.9 }}
						transition={{ type: "spring", bounce: 0.25, duration: 0.35 }}
						className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-lg"
					>
						<ArrowDown className="h-3 w-3" /> 最新へ
					</motion.button>
				)}
			</AnimatePresence>
		</div>
	);
}
