import { AnimatePresence, motion } from "framer-motion";
import type { RouteObject } from "react-router-dom";
import { useLocation, useRoutes } from "react-router-dom";

/**
 * モジュール内(一覧⇔詳細ページなど)のルート切替をクロスフェードさせるための共通コンポーネント。
 *
 * `<Routes>`/`useRoutes()`は呼び出される度にその時点の現在地(useLocationのライブな値)で
 * マッチングし直す。退出中の要素をAnimatePresenceで凍結しても、その内部で現在地を
 * 参照するルーティングが行われていると、Reactのコンテキスト伝播によって強制的に
 * 再レンダリングされ、退出アニメーション中に新ページの内容へすり替わってしまう
 * (`AppShell`の`useOutlet()`と同じ理由)。
 *
 * そのため、ここで`useRoutes()`を呼んで「その時点で解決済みの具象要素」を確定させてから
 * AnimatePresence/motion.divへ渡すことで、退出中の要素が現在地を再参照しないようにし、
 * 正しく「フェードしてから切り替わる」クロスフェードにする。
 */
export function AnimatedModuleRoutes({ routes }: { routes: RouteObject[] }) {
	const location = useLocation();
	const element = useRoutes(routes);

	return (
		<AnimatePresence mode="wait" initial={false}>
			<motion.div
				key={location.pathname}
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				exit={{ opacity: 0, y: -8 }}
				transition={{ type: "spring", bounce: 0, duration: 0.4 }}
				className="h-full"
			>
				{element}
			</motion.div>
		</AnimatePresence>
	);
}
