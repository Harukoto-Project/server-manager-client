import { useEffect, useState } from "react";
import { Navigate, Route, HashRouter as Router, Routes, useParams } from "react-router-dom";
import { AppShell } from "@renderer/components/layout/app-shell";
import { NodeAuthPage } from "@renderer/modules/auth/auth-page";
import { getVisibleModules } from "@renderer/modules/registry";
import { NodesPage } from "@renderer/pages/nodes-page";
import { useAuthStore } from "@renderer/state/auth-store";

function NodeShell() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
	const restoreFromSecureStore = useAuthStore((s) => s.restoreFromSecureStore);
	const [checking, setChecking] = useState(true);
	const [authed, setAuthed] = useState(false);

	useEffect(() => {
		if (!nodeId) {
			setChecking(false);
			return;
		}
		if (isAuthenticated(nodeId)) {
			setAuthed(true);
			setChecking(false);
			return;
		}
		restoreFromSecureStore(nodeId).then((ok) => {
			setAuthed(ok);
			setChecking(false);
		});
	}, [nodeId, isAuthenticated, restoreFromSecureStore]);

	if (checking) return null;
	if (!authed) return <NodeAuthPage />;
	return <AppShell />;
}

export function App() {
	const modules = getVisibleModules();

	return (
		<Router>
			<Routes>
				<Route path="/" element={<NodesPage />} />
				<Route path="/nodes/:nodeId" element={<NodeShell />}>
					<Route index element={<Navigate to={modules[0]?.id ?? "overview"} replace />} />
					{modules.map((module) => (
						<Route key={module.id} path={`${module.id}/*`} element={<module.element />} />
					))}
				</Route>
			</Routes>
		</Router>
	);
}
