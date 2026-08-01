import { TabPlaceholder } from "../shared";

/**
 * サーバー管理タブ。実装時は`/game-servers/admin/servers/:identifier`のAPIを利用する。
 * 破壊的操作(再インストール/凍結/削除)を含むため、実装時は`ConfirmDestructiveDialog`を必ず使用すること。
 */
export function AdminTab() {
	return (
		<TabPlaceholder
			title="サーバー管理は現在実装中です"
			description="サーバー詳細(名前/オーナー等)の編集、ビルド設定(リソース上限)の変更、再インストール、凍結/凍結解除、削除を後続タスクで実装予定です。"
		/>
	);
}
