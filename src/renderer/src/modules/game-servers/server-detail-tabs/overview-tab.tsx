import { ConsoleLogViewer } from "@renderer/components/common/console-log-viewer";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";

/** サーバー詳細ページの「概要」タブ。電源操作(親ページのヘッダー)とコンソール表示を担う */
export function OverviewTab() {
	return (
		<Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<CardHeader>
				<CardTitle className="text-sm">コンソール</CardTitle>
			</CardHeader>
			<CardContent className="flex min-h-0 flex-1 flex-col pb-6">
				<ConsoleLogViewer
					fillHeight
					className="h-full"
					lines={[]}
					emptyLabel="リアルタイムコンソールは今後の実装予定です"
				/>
			</CardContent>
		</Card>
	);
}
