import {
	AlertCircle,
	Check,
	CheckCircle2,
	DownloadCloud,
	Info,
	Loader2,
	Monitor,
	Moon,
	PanelLeftClose,
	RefreshCw,
	Sun,
	Waves,
} from "lucide-react";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { Switch } from "@renderer/components/ui/switch";
import { useAppPreferencesStore } from "@renderer/state/app-preferences-store";
import { useUpdaterStore } from "@renderer/state/updater-store";
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
	const { appVersion, checking, updaterEvent, checkForUpdates } = useUpdaterStore();

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

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-sm">
							<Info className="h-4 w-4" /> バージョン情報
						</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-3">
						<p className="text-sm text-muted-foreground">
							アプリのバージョン: {appVersion ?? "取得中..."}
						</p>

						<Button
							size="sm"
							variant="outline"
							className="w-fit"
							disabled={checking}
							onClick={() => void checkForUpdates()}
						>
							{checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
							アップデートを確認
						</Button>

						{updaterEvent?.type === "checking-for-update" && (
							<p className="text-xs text-muted-foreground">更新を確認しています...</p>
						)}

						{updaterEvent?.type === "update-not-available" && (
							<div className="flex items-center gap-2 rounded-md border border-input bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
								<CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
								<span>お使いのバージョンは最新です(v{updaterEvent.version})。</span>
							</div>
						)}

						{updaterEvent?.type === "update-available" && (
							<div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
								<DownloadCloud className="h-3.5 w-3.5 shrink-0" />
								<span>新しいバージョン(v{updaterEvent.version})が見つかりました。ダウンロードしています...</span>
							</div>
						)}

						{updaterEvent?.type === "download-progress" && (
							<div className="space-y-1">
								<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
									<div
										className="h-full rounded-full bg-primary transition-[width]"
										style={{ width: `${Math.round(updaterEvent.percent)}%` }}
									/>
								</div>
								<p className="text-xs text-muted-foreground">
									ダウンロード中... {Math.round(updaterEvent.percent)}%
								</p>
							</div>
						)}

						{updaterEvent?.type === "update-downloaded" && (
							<div className="flex flex-col gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
								<div className="flex items-center gap-2">
									<CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
									<span>更新の準備が完了しました(v{updaterEvent.version})。</span>
								</div>
								<Button size="sm" className="w-fit" onClick={() => void window.api.updater.quitAndInstall()}>
									今すぐ再起動して更新
								</Button>
							</div>
						)}

						{updaterEvent?.type === "error" && (
							<div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
								<AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
								<span>更新の確認中にエラーが発生しました: {updaterEvent.message}</span>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</DashboardPageLayout>
	);
}
