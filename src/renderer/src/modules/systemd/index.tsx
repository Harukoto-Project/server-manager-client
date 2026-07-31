import { Layers3 } from "lucide-react";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Card, CardContent } from "@renderer/components/ui/card";
import type { ModuleDefinition } from "@renderer/modules/types";

function SystemdPage() {
	return (
		<DashboardPageLayout
			title="systemdサービス"
			description="サービスの起動/停止/再起動とjournalログの閲覧を行います(GET /systemd/units 接続後に実データへ差し替え)。"
		>
			<Card>
				<CardContent className="py-6 text-sm text-muted-foreground">
					まだノードに接続されていません。ノード接続後、稼働中のsystemdサービス一覧がここに表示されます。
				</CardContent>
			</Card>
		</DashboardPageLayout>
	);
}

export const systemdModule: ModuleDefinition = {
	id: "systemd",
	label: "systemdサービス",
	icon: Layers3,
	group: "operations",
	order: 20,
	element: SystemdPage,
};
