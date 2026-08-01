import { TabPlaceholder } from "../shared";

/** データベースタブ。実装時は`/game-servers/databases/:identifier`のAPIを利用する */
export function DatabaseTab() {
	return (
		<TabPlaceholder
			title="データベース管理は現在実装中です"
			description="サーバー専用データベースの作成・接続情報の確認・パスワード再発行・削除を後続タスクで実装予定です。"
		/>
	);
}
