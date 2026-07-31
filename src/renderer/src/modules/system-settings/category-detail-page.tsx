import { Construction } from "lucide-react";
import type { ComponentType } from "react";
import { useParams } from "react-router-dom";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Card, CardContent } from "@renderer/components/ui/card";
import { systemSettingsCategories } from "./categories";
import { AdminPrivilegesPage } from "./pages/admin-privileges-page";
import { ApiUpdatePage } from "./pages/api-update-page";
import { AppPreferencesPage } from "./pages/app-preferences-page";
import { AptUpdatesPage } from "./pages/apt-updates-page";
import { AutoSecurityUpdatesPage } from "./pages/auto-security-updates-page";
import { DatetimePage } from "./pages/datetime-page";
import { DiskMountsPage } from "./pages/disk-mounts-page";
import { FirewallPage } from "./pages/firewall-page";
import { HostnamePage } from "./pages/hostname-page";
import { IntrusionPreventionPage } from "./pages/intrusion-prevention-page";
import { LanguageRegionPage } from "./pages/language-region-page";
import { LogManagementPage } from "./pages/log-management-page";
import { NameResolutionPage } from "./pages/name-resolution-page";
import { NetworkConfigPage } from "./pages/network-config-page";
import { PowerSchedulePage } from "./pages/power-schedule-page";
import { RemoteAccessPage } from "./pages/remote-access-page";
import { ScheduledTasksPage } from "./pages/scheduled-tasks-page";
import { SshKeysPage } from "./pages/ssh-keys-page";
import { SwapMemoryPage } from "./pages/swap-memory-page";
import { UsersGroupsPage } from "./pages/users-groups-page";

const categoryComponents: Record<string, ComponentType> = {
	"apt-updates": AptUpdatesPage,
	hostname: HostnamePage,
	datetime: DatetimePage,
	"language-region": LanguageRegionPage,
	"users-groups": UsersGroupsPage,
	"admin-privileges": AdminPrivilegesPage,
	"ssh-keys": SshKeysPage,
	firewall: FirewallPage,
	"remote-access": RemoteAccessPage,
	"auto-security-updates": AutoSecurityUpdatesPage,
	"intrusion-prevention": IntrusionPreventionPage,
	"network-config": NetworkConfigPage,
	"name-resolution": NameResolutionPage,
	"scheduled-tasks": ScheduledTasksPage,
	"log-management": LogManagementPage,
	"swap-memory": SwapMemoryPage,
	"disk-mounts": DiskMountsPage,
	"power-schedule": PowerSchedulePage,
	"app-preferences": AppPreferencesPage,
	"api-update": ApiUpdatePage,
};

function PlaceholderDetailPage() {
	const { nodeId, category: categoryId } = useParams<{ nodeId: string; category: string }>();
	const category = systemSettingsCategories.find((c) => c.id === categoryId);

	return (
		<DashboardPageLayout
			backTo={`/nodes/${nodeId}/system-settings`}
			backLabel="設定一覧に戻る"
			title={category?.label ?? "設定"}
			description={category?.description}
		>
			<Card>
				<CardContent className="flex flex-col items-center gap-3 py-16 text-center">
					<Construction className="h-8 w-8 text-muted-foreground" />
					<p className="text-sm font-medium">この機能は現在実装中です</p>
					<p className="max-w-md text-xs text-muted-foreground">
						この設定ページの内容は後続のタスクで実装予定です。しばらくお待ちください。
					</p>
				</CardContent>
			</Card>
		</DashboardPageLayout>
	);
}

export function CategoryDetailPage() {
	const { category: categoryId } = useParams<{ nodeId: string; category: string }>();
	const Component = categoryId ? categoryComponents[categoryId] : undefined;
	if (!Component) return <PlaceholderDetailPage />;
	return <Component />;
}
