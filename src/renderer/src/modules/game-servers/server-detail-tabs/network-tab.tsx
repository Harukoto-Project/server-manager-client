import { TabPlaceholder } from "../shared";

/** ネットワーク(アロケーション)タブ。実装時は`/game-servers/network/:identifier`のAPIを利用する */
export function NetworkTab() {
	return (
		<TabPlaceholder
			title="ネットワーク(アロケーション)管理は現在実装中です"
			description="このサーバーに割り当てられたIPアドレス/ポートの確認・追加・主アドレス変更・解除を後続タスクで実装予定です。"
		/>
	);
}
