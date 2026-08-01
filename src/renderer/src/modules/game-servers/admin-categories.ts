import { Layers, Network, PlusSquare, Server, ShieldCheck, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface GameServersAdminCategory {
	id: string;
	label: string;
	icon: LucideIcon;
	description: string;
}

/**
 * ゲームサーバー管理者機能ハブ(Pterodactyl Application API相当、パネル全体の管理機能)のカテゴリ一覧。
 * `system-settings/categories.ts`と同じパターン(カテゴリ一覧→動的マッピング→個別ページ)を採用する。
 */
export const gameServersAdminCategories: GameServersAdminCategory[] = [
	{
		id: "create-server",
		label: "サーバー作成",
		icon: PlusSquare,
		description: "Nest/Egg/ノード/割り当てリソースを指定して新しいゲームサーバーを作成します。",
	},
	{
		id: "egg-nest",
		label: "Egg・Nestライブラリ管理",
		icon: Layers,
		description: "サーバーの雛形(Egg)と分類(Nest)を閲覧・管理します。変数編集やインポート/エクスポートもここで行います。",
	},
	{
		id: "nodes",
		label: "ノード管理",
		icon: Server,
		description: "サーバーが配置されているPterodactylノードの一覧と設定を確認します。",
	},
	{
		id: "panel-users",
		label: "パネルユーザー管理",
		icon: Users,
		description:
			"Pterodactylパネルへのログインアカウントを管理します。「システム設定」の「ユーザー・グループ管理」(このサーバー自体のLinuxシステムユーザー)とは別物です。",
	},
	{
		id: "allocations",
		label: "アロケーション管理",
		icon: Network,
		description: "各ノードに割り当てるIPアドレス/ポートの一覧・追加・削除を行います。",
	},
	{
		id: "mounts-roles",
		label: "マウント・ロール管理",
		icon: ShieldCheck,
		description: "サーバーに追加でマウントできるボリュームと、パネル管理者のロール(権限セット)を管理します。",
	},
];
