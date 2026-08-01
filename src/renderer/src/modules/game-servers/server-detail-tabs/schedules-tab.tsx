import { TabPlaceholder } from "../shared";

/** スケジュール(自動タスク)タブ。実装時は`/game-servers/schedules/:identifier`のAPIを利用する */
export function SchedulesTab() {
	return (
		<TabPlaceholder
			title="スケジュール(自動タスク)管理は現在実装中です"
			description="定期実行スケジュールと、その中で実行するタスク(コマンド送信/電源操作/バックアップ作成)の管理を後続タスクで実装予定です。"
		/>
	);
}
