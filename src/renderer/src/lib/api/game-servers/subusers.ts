import { type NodeAddress, NodeApiError, authorizedFetch, baseUrl } from "@renderer/lib/node-api-client";

export interface GameServerSubuser {
	uuid: string;
	email: string;
	username: string | null;
	image: string | null;
	twoFactorEnabled: boolean;
	permissions: string[];
}

/**
 * Pterodactyl Client APIの代表的な権限一覧。パネル側に権限一覧取得APIが無いため、
 * よく使われる権限をカテゴリごとに手動で定義してチェックボックスUIに用いる。
 */
export interface SubuserPermissionOption {
	value: string;
	label: string;
}

export interface SubuserPermissionGroup {
	category: string;
	permissions: SubuserPermissionOption[];
}

export const SUBUSER_PERMISSION_GROUPS: SubuserPermissionGroup[] = [
	{
		category: "コンソール/電源操作",
		permissions: [
			{ value: "control.console", label: "コンソールの閲覧・コマンド送信" },
			{ value: "control.start", label: "起動" },
			{ value: "control.stop", label: "停止" },
			{ value: "control.restart", label: "再起動" },
		],
	},
	{
		category: "ユーザー管理",
		permissions: [
			{ value: "user.create", label: "サブユーザーの追加" },
			{ value: "user.read", label: "サブユーザーの閲覧" },
			{ value: "user.update", label: "サブユーザー権限の変更" },
			{ value: "user.delete", label: "サブユーザーの削除" },
		],
	},
	{
		category: "ファイル管理",
		permissions: [
			{ value: "file.create", label: "作成" },
			{ value: "file.read", label: "閲覧" },
			{ value: "file.read-content", label: "内容の閲覧" },
			{ value: "file.update", label: "編集" },
			{ value: "file.delete", label: "削除" },
			{ value: "file.archive", label: "圧縮/展開" },
			{ value: "file.sftp", label: "SFTPアクセス" },
		],
	},
	{
		category: "バックアップ",
		permissions: [
			{ value: "backup.create", label: "作成" },
			{ value: "backup.read", label: "閲覧" },
			{ value: "backup.delete", label: "削除" },
			{ value: "backup.download", label: "ダウンロード" },
			{ value: "backup.restore", label: "復元" },
		],
	},
	{
		category: "データベース",
		permissions: [
			{ value: "database.create", label: "作成" },
			{ value: "database.read", label: "閲覧" },
			{ value: "database.update", label: "パスワード再発行" },
			{ value: "database.delete", label: "削除" },
			{ value: "database.view_password", label: "パスワードの閲覧" },
		],
	},
	{
		category: "スケジュール",
		permissions: [
			{ value: "schedule.create", label: "作成" },
			{ value: "schedule.read", label: "閲覧" },
			{ value: "schedule.update", label: "編集" },
			{ value: "schedule.delete", label: "削除" },
		],
	},
	{
		category: "ネットワーク(アロケーション)",
		permissions: [
			{ value: "allocation.read", label: "閲覧" },
			{ value: "allocation.create", label: "追加" },
			{ value: "allocation.update", label: "編集(メモ/プライマリ)" },
			{ value: "allocation.delete", label: "解除" },
		],
	},
	{
		category: "起動設定",
		permissions: [
			{ value: "startup.read", label: "閲覧" },
			{ value: "startup.update", label: "編集" },
			{ value: "startup.docker-image", label: "Dockerイメージの変更" },
		],
	},
	{
		category: "サーバー設定",
		permissions: [
			{ value: "settings.rename", label: "名前・説明の変更" },
			{ value: "settings.reinstall", label: "再インストール" },
			{ value: "activity.read", label: "アクティビティログの閲覧" },
		],
	},
];

async function authorizedPatch(node: NodeAddress, token: string, path: string, body: unknown): Promise<Response> {
	let response: Response;
	try {
		response = await fetch(`${baseUrl(node)}${path}`, {
			method: "PATCH",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		});
	} catch {
		throw new NodeApiError("ノードに接続できません。ホスト/ポートやネットワーク(WireGuard等)を確認してください。");
	}
	if (response.status === 401) {
		throw new NodeApiError("アクセストークンが正しくありません。", 401);
	}
	if (!response.ok) {
		let message = `ノードからエラー応答がありました(HTTP ${response.status})`;
		try {
			const data = (await response.clone().json()) as { error?: string };
			if (data.error) message = data.error;
		} catch {
			// レスポンスボディがJSONでない場合はデフォルトメッセージを使う
		}
		throw new NodeApiError(message, response.status);
	}
	return response;
}

export async function fetchSubusers(node: NodeAddress, token: string, identifier: string): Promise<GameServerSubuser[]> {
	const response = await authorizedFetch(node, token, `/game-servers/subusers/${identifier}`);
	const { subusers } = (await response.json()) as { subusers: GameServerSubuser[] };
	return subusers;
}

export async function inviteSubuser(
	node: NodeAddress,
	token: string,
	identifier: string,
	email: string,
	permissions: string[],
): Promise<GameServerSubuser> {
	const response = await authorizedFetch(node, token, `/game-servers/subusers/${identifier}`, {
		method: "POST",
		body: { email, permissions },
	});
	const { subuser } = (await response.json()) as { subuser: GameServerSubuser };
	return subuser;
}

export async function updateSubuserPermissions(
	node: NodeAddress,
	token: string,
	identifier: string,
	subuserUuid: string,
	permissions: string[],
): Promise<GameServerSubuser> {
	const response = await authorizedPatch(node, token, `/game-servers/subusers/${identifier}/${subuserUuid}`, {
		permissions,
	});
	const { subuser } = (await response.json()) as { subuser: GameServerSubuser };
	return subuser;
}

export async function removeSubuser(
	node: NodeAddress,
	token: string,
	identifier: string,
	subuserUuid: string,
): Promise<void> {
	await authorizedFetch(node, token, `/game-servers/subusers/${identifier}/${subuserUuid}`, { method: "DELETE" });
}

export { NodeApiError };
