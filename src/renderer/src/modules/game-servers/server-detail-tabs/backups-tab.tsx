import { TabPlaceholder } from "../shared";

/** バックアップタブ。実装時は`/game-servers/backups/:identifier`のAPIを利用する */
export function BackupsTab() {
	return (
		<TabPlaceholder
			title="バックアップ管理は現在実装中です"
			description="バックアップの作成・一覧・ダウンロード・復元・削除を後続タスクで実装予定です。"
		/>
	);
}
