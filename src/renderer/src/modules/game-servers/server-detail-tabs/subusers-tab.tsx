import { TabPlaceholder } from "../shared";

/** サブユーザー(共同管理者)タブ。実装時は`/game-servers/subusers/:identifier`のAPIを利用する */
export function SubusersTab() {
	return (
		<TabPlaceholder
			title="サブユーザー(共同管理者)管理は現在実装中です"
			description="このサーバーを操作できる共同管理者の招待・権限編集・削除を後続タスクで実装予定です。"
		/>
	);
}
