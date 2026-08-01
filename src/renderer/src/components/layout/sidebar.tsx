import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, DownloadCloud, Info, PanelLeftClose, PanelLeftOpen, Server } from "lucide-react";
import { useEffect } from "react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { MODULE_GROUP_LABEL, MODULE_GROUP_ORDER } from "@renderer/modules/types";
import { getVisibleModules } from "@renderer/modules/registry";
import { useNodeAccessToken } from "@renderer/hooks/use-node-access-token";
import { fetchNodeHealth } from "@renderer/lib/node-api-client";
import { cn } from "@renderer/lib/utils";
import { useAppPreferencesStore } from "@renderer/state/app-preferences-store";
import { useNodesStore } from "@renderer/state/nodes-store";
import { useUpdaterStore } from "@renderer/state/updater-store";

/**
 * サイドメニュー: モジュールregistryを描画するだけのシェル。
 * 選択状態はframer-motionのlayoutIdによるspringインジケータで表現する
 * (Apple Design適用方針: damping 1.0 相当のcriticaly-dampedなspring)。
 * 折りたたみ状態は「アプリの表示設定」ページで変更した値を`app-preferences-store`経由で反映する。
 */
export function Sidebar() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const navigate = useNavigate();
	const modules = getVisibleModules();
	const { preferences, loaded, load, update } = useAppPreferencesStore();
	const { appVersion, updaterEvent } = useUpdaterStore();
	const node = useNodesStore((s) => s.nodes.find((n) => n.id === nodeId));
	const { data: token } = useNodeAccessToken(nodeId);

	useEffect(() => {
		if (!loaded) void load();
	}, [loaded, load]);

	const healthQuery = useQuery({
		queryKey: ["api-update-health", nodeId],
		queryFn: () => fetchNodeHealth(node!),
		enabled: Boolean(node && token),
		staleTime: 60_000,
		refetchInterval: 5 * 60 * 1000,
		retry: 1,
	});

	const collapsed = preferences?.sidebarCollapsed ?? false;
	const clientUpdateReady = updaterEvent?.type === "update-downloaded";
	const apiVersion = healthQuery.data?.version;

	const grouped = MODULE_GROUP_ORDER.map((group) => ({
		group,
		items: modules.filter((module) => module.group === group),
	})).filter((section) => section.items.length > 0);

	return (
		<nav
			className={cn(
				"glass-panel flex h-full shrink-0 flex-col gap-1 border-r border-border/60 py-4 text-sidebar-foreground transition-[width] duration-200",
				collapsed ? "w-16 px-2" : "w-60 px-3",
			)}
			aria-label="サイドメニュー"
		>
			<button
				type="button"
				title="ノード一覧へ戻る"
				onClick={() => navigate("/")}
				className={cn(
					"mb-3 flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
					collapsed && "justify-center",
				)}
			>
				<ArrowLeft className="h-3.5 w-3.5 shrink-0" /> {!collapsed && "ノード一覧へ戻る"}
			</button>

			<div className="flex flex-1 flex-col gap-4 overflow-y-auto no-scrollbar">
				{grouped.map((section) => (
					<div key={section.group}>
						{!collapsed && (
							<p className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
								{MODULE_GROUP_LABEL[section.group]}
							</p>
						)}
						<div className="flex flex-col gap-0.5">
							{section.items.map((module) => (
								<NavLink
									key={module.id}
									to={`/nodes/${nodeId}/${module.id}`}
									title={collapsed ? module.label : undefined}
									className={cn(
										"relative flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors",
										collapsed && "justify-center",
									)}
								>
									{({ isActive }) => (
										<>
											{isActive && (
												<motion.span
													layoutId="sidebar-active-indicator"
													className="absolute inset-0 rounded-md bg-primary/12"
													transition={{ type: "spring", bounce: 0, duration: 0.35 }}
												/>
											)}
											<module.icon
												className={cn(
													"relative z-10 h-4 w-4 shrink-0",
													isActive ? "text-primary" : "text-muted-foreground",
												)}
											/>
											{!collapsed && (
												<span className={cn("relative z-10", isActive && "text-primary")}>{module.label}</span>
											)}
										</>
									)}
								</NavLink>
							))}
						</div>
					</div>
				))}
			</div>

			<div className="mt-2 flex flex-col gap-0.5 border-t border-border/60 pt-2">
				<button
					type="button"
					title={
						collapsed
							? `サーバー管理アプリ v${appVersion ?? "?"}${clientUpdateReady ? "(更新あり)" : ""}`
							: undefined
					}
					onClick={() => navigate(`/nodes/${nodeId}/system-settings/settings/app-preferences`)}
					className={cn(
						"flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
						collapsed && "justify-center",
					)}
				>
					<span className="relative flex shrink-0 items-center justify-center">
						{clientUpdateReady ? <DownloadCloud className="h-3.5 w-3.5 text-primary" /> : <Info className="h-3.5 w-3.5" />}
						{clientUpdateReady && (
							<span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
						)}
					</span>
					{!collapsed && (
						<span className="truncate">
							アプリ v{appVersion ?? "…"}
							{clientUpdateReady && <span className="ml-1 text-primary">更新あり</span>}
						</span>
					)}
				</button>

				{nodeId && (
					<button
						type="button"
						title={collapsed ? `接続中サーバー API v${apiVersion ?? "?"}` : undefined}
						onClick={() => navigate(`/nodes/${nodeId}/system-settings/settings/api-update`)}
						className={cn(
							"flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
							collapsed && "justify-center",
						)}
					>
						<Server className="h-3.5 w-3.5 shrink-0" />
						{!collapsed && <span className="truncate">API v{apiVersion ?? "…"}</span>}
					</button>
				)}
			</div>

			<button
				type="button"
				title={collapsed ? "サイドメニューを展開" : "サイドメニューを折りたたむ"}
				onClick={() => void update({ sidebarCollapsed: !collapsed })}
				className={cn(
					"mt-2 flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
					collapsed && "justify-center",
				)}
			>
				{collapsed ? <PanelLeftOpen className="h-3.5 w-3.5 shrink-0" /> : <PanelLeftClose className="h-3.5 w-3.5 shrink-0" />}
				{!collapsed && "折りたたむ"}
			</button>
		</nav>
	);
}
