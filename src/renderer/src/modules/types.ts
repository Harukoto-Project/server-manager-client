import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";

export type ModuleGroup = "overview" | "operations" | "games" | "development" | "system";

/**
 * サイドメニュー+ダッシュボードのページ/モジュールテンプレート化(Notion「UI/UXアーキテクチャ」対応)。
 * 新しいページを追加する場合は `src/renderer/src/modules/<feature>/index.tsx` を1つ作成し、
 * `registry.tsx` に1エントリ追加するだけでよい。シェル(Sidebar/Router)側は一切変更不要。
 */
export interface ModuleDefinition {
	/** モジュールの一意なID。ルートパスにも使用する */
	id: string;
	/** サイドメニューに表示するラベル */
	label: string;
	/** サイドメニューに表示するアイコン */
	icon: LucideIcon;
	/** サイドメニュー上のグループ分け */
	group: ModuleGroup;
	/** 同一グループ内での表示順 */
	order: number;
	/** ページ本体のコンポーネント */
	element: ComponentType;
	/** サイドメニューでの表示を一時的に隠したい場合はtrue */
	hidden?: boolean;
}

export const MODULE_GROUP_LABEL: Record<ModuleGroup, string> = {
	overview: "概要",
	operations: "運用",
	games: "ゲームサーバー",
	development: "開発プロジェクト",
	system: "システム",
};

export const MODULE_GROUP_ORDER: ModuleGroup[] = ["overview", "operations", "games", "development", "system"];
