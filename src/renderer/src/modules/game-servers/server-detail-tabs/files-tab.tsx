import { TabPlaceholder } from "../shared";

/** ファイル管理タブ。実装時は`/game-servers/files/:identifier/*`のAPIを利用する */
export function FilesTab() {
	return (
		<TabPlaceholder
			title="ファイル管理は現在実装中です"
			description="ディレクトリの閲覧・編集・アップロード/ダウンロード・圧縮/展開などを後続タスクで実装予定です。"
		/>
	);
}
