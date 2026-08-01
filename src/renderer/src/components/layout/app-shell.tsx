import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useLocation, useOutlet } from "react-router-dom";
import { useNodesStore } from "@renderer/state/nodes-store";
import { useUpdaterStore } from "@renderer/state/updater-store";
import { Sidebar } from "./sidebar";

/**
 * 固定シェル: 左サイドメニュー + 右側ダッシュボードコンテンツ。
 * ページ切替はクロスフェード+わずかなY移動のspring遷移(Apple Design適用方針)。
 * prefers-reduced-motion環境ではCSS側でduration相当が短縮される(globals.css参照)。
 *
 * `<Outlet />`をそのままAnimatePresence配下に置くと、退出アニメーション中でも
 * Outletは常に「現在のルート」を描画してしまうため、退出中の要素が新ページの内容に
 * 差し替わった状態でフェードする(切り替わってからフェードする)違和感が出る。
 * `useOutlet()`でその時点の要素を値として確定させ、退出中の古い要素をフリーズさせることで、
 * 「フェードしてから切り替わる」正しいクロスフェードにする。
 */
export function AppShell() {
	const location = useLocation();
	const outlet = useOutlet();
	const { loaded, load } = useNodesStore();
	const initUpdater = useUpdaterStore((s) => s.init);

	// NodesPageを経由せず直接 /nodes/:id/... へ遷移した場合(再読み込み等)でも
	// ノード一覧をロードしておく(overviewページ等がノード情報を必要とするため)。
	useEffect(() => {
		if (!loaded) void load();
	}, [loaded, load]);

	// クライアント更新イベントの購読はアプリ全体で一度だけ行う(サイドバーの常時表示のため)。
	useEffect(() => {
		initUpdater();
	}, [initUpdater]);

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
						{outlet}
					</motion.div>
				</AnimatePresence>
			</main>
		</div>
	);
}
