import { AnimatePresence, motion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./sidebar";

/**
 * 固定シェル: 左サイドメニュー + 右側ダッシュボードコンテンツ。
 * ページ切替はクロスフェード+わずかなY移動のspring遷移(Apple Design適用方針)。
 * prefers-reduced-motion環境ではCSS側でduration相当が短縮される(globals.css参照)。
 */
export function AppShell() {
	const location = useLocation();

	return (
		<div className="flex h-screen w-screen overflow-hidden bg-background">
			<Sidebar />
			<main className="relative flex-1 overflow-hidden">
				<AnimatePresence mode="wait" initial={false}>
					<motion.div
						key={location.pathname}
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -8 }}
						transition={{ type: "spring", bounce: 0, duration: 0.4 }}
						className="h-full"
					>
						<Outlet />
					</motion.div>
				</AnimatePresence>
			</main>
		</div>
	);
}
