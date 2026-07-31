import { Network, Settings, ShieldCheck, Timer, Users } from "lucide-react";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import type { ModuleDefinition } from "@renderer/modules/types";

const sections = [
	{ title: "apt更新", icon: Settings, hint: "更新確認・適用・再起動リマインダー" },
	{ title: "ユーザー/グループ", icon: Users, hint: "ローカルユーザー・グループ管理" },
	{ title: "UFW", icon: ShieldCheck, hint: "ファイアウォールルールの編集" },
	{ title: "ネットワーク", icon: Network, hint: "インターフェース/IP/DNS/ルート設定" },
	{ title: "cron/タイマー", icon: Timer, hint: "定期実行タスクの管理" },
];

function SystemSettingsPage() {
	return (
		<DashboardPageLayout
			title="システム設定"
			description="apt・ユーザー・UFW・ネットワーク・cron/systemdタイマー・ストレージ・ホスト名等をまとめて管理します。"
		>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
				{sections.map((section) => (
					<Card key={section.title}>
						<CardHeader className="flex-row items-center gap-2 space-y-0">
							<section.icon className="h-4 w-4 text-muted-foreground" />
							<CardTitle className="text-sm font-medium">{section.title}</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-xs text-muted-foreground">{section.hint}</p>
						</CardContent>
					</Card>
				))}
			</div>
		</DashboardPageLayout>
	);
}

export const systemSettingsModule: ModuleDefinition = {
	id: "system-settings",
	label: "システム設定",
	icon: Settings,
	group: "system",
	order: 30,
	element: SystemSettingsPage,
};
