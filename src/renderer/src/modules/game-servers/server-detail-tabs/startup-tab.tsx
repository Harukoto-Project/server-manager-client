import { TabPlaceholder } from "../shared";

/** 起動設定タブ。実装時は`/game-servers/startup/:identifier`のAPIを利用する */
export function StartupTab() {
	return (
		<TabPlaceholder
			title="起動設定は現在実装中です"
			description="スタートアップコマンド・Dockerイメージ・環境変数(Egg変数)の確認・変更を後続タスクで実装予定です。"
		/>
	);
}
