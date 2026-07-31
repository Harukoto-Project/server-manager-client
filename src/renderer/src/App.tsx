import { Navigate, Route, HashRouter as Router, Routes } from "react-router-dom";
import { AppShell } from "@renderer/components/layout/app-shell";
import { getVisibleModules } from "@renderer/modules/registry";
import { NodesPage } from "@renderer/pages/nodes-page";

/**
 * ルーティング全体。ノード配下のページはmoduleRegistryから自動生成するため、
 * 新しいモジュールを追加してもこのファイルを変更する必要はない。
 */
export function App() {
	const modules = getVisibleModules();

	return (
		<Router>
			<Routes>
				<Route path="/" element={<NodesPage />} />
				<Route path="/nodes/:nodeId" element={<AppShell />}>
					<Route index element={<Navigate to={modules[0]?.id ?? "overview"} replace />} />
					{modules.map((module) => (
						<Route key={module.id} path={module.id} element={<module.element />} />
					))}
				</Route>
			</Routes>
		</Router>
	);
}
