import { Check, Monitor, Moon, PanelLeftClose, Sun, Waves } from "lucide-react";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { Switch } from "@renderer/components/ui/switch";
import { useAppPreferencesStore } from "@renderer/state/app-preferences-store";
import { type ThemePreference, useTheme } from "@renderer/theme/theme-provider";

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
	{ value: "light", label: "ライト", icon: Sun },
	{ value: "dark", label: "ダーク", icon: Moon },
	{ value: "system", label: "システムに合わせる", icon: Monitor },
];

const MOTION_OPTIONS: Array<{ value: boolean | null; label: string }> = [
	{ value: null, label: "システムに合わせる" },
	{ value: true, label: "常に減らす" },
	{ value: false, label: "常に有効にする" },
];

export function AppPreferencesPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const { theme, setTheme } = useTheme();
	const { preferences, loaded, load, update } = useAppPreferencesStore();

	useEffect(() => {
		if (!loaded) void load();
	}, [loaded, load]);

	const sidebarCollapsed = preferences?.sidebarCollapsed ?? false;
	const reducedMotionOverride = preferences?.reducedMotionOverride ?? null;

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/system-settings`}
			backLabel="設定一覧に戻る"
			title="アプリの表示設定"
			description="このアプリ(サーバー管理画面)の見た目や動作に関する設定です。"
		>
			<div className="max-w-lg space-y-4">
				<Card>
					<CardHeader>
						<CardTitle className="text-sm">テーマ</CardTitle>
					</CardHeader>
					<CardContent className="grid grid-cols-3 gap-2">
						{THEME_OPTIONS.map((option) => (
							<button
								key={option.value}
								type="button"
								onClick={() => setTheme(option.value)}
								className={`flex flex-col items-center gap-2 rounded-lg border p-3 text-xs transition-colors ${
									theme === option.value
										? "border-primary bg-primary/10 text-primary"
										: "border-input hover:bg-accent hover:text-accent-foreground"
								}`}
							>
								<option.icon className="h-4 w-4" />
								<span>{option.label}</span>
								{theme === option.value && <Check className="h-3 w-3" />}
							</button>
						))}
					</CardContent>
				</Card>

				<Card>
					<CardContent className="flex items-center justify-between p-4">
						<div className="flex items-center gap-3">
							<PanelLeftClose className="h-4 w-4 text-muted-foreground" />
							<div>
								<p className="text-sm font-medium">サイドバーを折りたたむ</p>
								<p className="text-xs text-muted-foreground">アイコンのみのコンパクトな表示にします</p>
							</div>
						</div>
						<Switch
							checked={sidebarCollapsed}
							onCheckedChange={(checked) => void update({ sidebarCollapsed: checked })}
						/>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-sm">
							<Waves className="h-4 w-4" /> アニメーションの量
						</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-2">
						{MOTION_OPTIONS.map((option) => (
							<Button
								key={String(option.value)}
								variant={reducedMotionOverride === option.value ? "default" : "outline"}
								size="sm"
								className="justify-start"
								onClick={() => void update({ reducedMotionOverride: option.value })}
							>
								{reducedMotionOverride === option.value && <Check className="h-3.5 w-3.5" />}
								{option.label}
							</Button>
						))}
						<p className="mt-1 text-xs text-muted-foreground">
							「常に減らす」を選ぶと、画面遷移やホバー時のアニメーションを最小限にします。
						</p>
					</CardContent>
				</Card>
			</div>
		</DashboardPageLayout>
	);
}
