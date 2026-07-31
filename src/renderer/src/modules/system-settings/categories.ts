import {
	BookText,
	Clock,
	DownloadCloud,
	Fingerprint,
	Globe,
	HardDrive,
	KeyRound,
	Lock,
	MemoryStick,
	Network,
	Package,
	Palette,
	Power,
	ScrollText,
	ShieldAlert,
	ShieldBan,
	ShieldCheck,
	Tag,
	Timer,
	Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SystemSettingsApiStatus = "ready" | "partial" | "none";

export type SystemSettingsGroup = "basic" | "account" | "security" | "network" | "maintenance" | "app";

export interface SystemSettingsCategory {
	id: string;
	label: string;
	icon: LucideIcon;
	description: string;
	group: SystemSettingsGroup;
	apiStatus: SystemSettingsApiStatus;
}

export const SYSTEM_SETTINGS_GROUPS: SystemSettingsGroup[] = [
	"basic",
	"account",
	"security",
	"network",
	"maintenance",
	"app",
];

export const SYSTEM_SETTINGS_GROUP_LABEL: Record<SystemSettingsGroup, string> = {
	basic: "基本設定",
	account: "アカウント・権限",
	security: "セキュリティ",
	network: "ネットワーク",
	maintenance: "メンテナンス・運用",
	app: "アプリの設定",
};

export const systemSettingsCategories: SystemSettingsCategory[] = [
	{
		id: "apt-updates",
		label: "アップデートの確認・適用",
		icon: Package,
		description: "インストール済みソフトウェアの更新確認と適用を行います。",
		group: "basic",
		apiStatus: "ready",
	},
	{
		id: "hostname",
		label: "サーバー名(ホスト名)",
		icon: Tag,
		description: "このサーバーの名前を確認・変更します。",
		group: "basic",
		apiStatus: "partial",
	},
	{
		id: "datetime",
		label: "日付と時刻",
		icon: Clock,
		description: "タイムゾーンや時刻の設定を確認・変更します。",
		group: "basic",
		apiStatus: "partial",
	},
	{
		id: "language-region",
		label: "言語と地域",
		icon: Globe,
		description: "システムで使う言語や地域(表示形式)の設定を行います。",
		group: "basic",
		apiStatus: "none",
	},
	{
		id: "users-groups",
		label: "ユーザー・グループ管理",
		icon: Users,
		description: "サーバーにログインできる利用者とグループを管理します。",
		group: "account",
		apiStatus: "none",
	},
	{
		id: "admin-privileges",
		label: "管理者権限の管理",
		icon: Lock,
		description: "どの利用者が管理者操作を行えるかを管理します。",
		group: "account",
		apiStatus: "none",
	},
	{
		id: "ssh-keys",
		label: "SSH公開鍵の管理",
		icon: Fingerprint,
		description: "パスワードなしでログインするための鍵情報を管理します。",
		group: "account",
		apiStatus: "none",
	},
	{
		id: "firewall",
		label: "ファイアウォール",
		icon: ShieldCheck,
		description: "外部からの接続を許可・拒否するルールを管理します。",
		group: "security",
		apiStatus: "ready",
	},
	{
		id: "remote-access",
		label: "リモート接続(SSH)の設定",
		icon: KeyRound,
		description: "遠隔操作用の接続方法(ポート番号やログイン方法)を設定します。",
		group: "security",
		apiStatus: "none",
	},
	{
		id: "auto-security-updates",
		label: "自動セキュリティ更新",
		icon: ShieldAlert,
		description: "重要な修正を自動的に適用するかどうかを設定します。",
		group: "security",
		apiStatus: "none",
	},
	{
		id: "intrusion-prevention",
		label: "不正アクセス防止",
		icon: ShieldBan,
		description: "ログイン試行の失敗を検知して自動的に遮断する設定です。",
		group: "security",
		apiStatus: "none",
	},
	{
		id: "network-config",
		label: "ネットワーク設定の変更",
		icon: Network,
		description: "IPアドレスやDNSなど接続設定を変更します(閲覧は「ネットワーク」ページ参照)。",
		group: "network",
		apiStatus: "none",
	},
	{
		id: "name-resolution",
		label: "名前解決の設定",
		icon: BookText,
		description: "名前とアドレスの対応表や、問い合わせ先の設定を管理します。",
		group: "network",
		apiStatus: "none",
	},
	{
		id: "scheduled-tasks",
		label: "定期実行タスク",
		icon: Timer,
		description: "決まった時間に自動で処理を実行する設定を管理します。",
		group: "maintenance",
		apiStatus: "none",
	},
	{
		id: "log-management",
		label: "ログ管理の設定",
		icon: ScrollText,
		description: "記録(ログ)の保存期間や整理方法を設定します。",
		group: "maintenance",
		apiStatus: "none",
	},
	{
		id: "swap-memory",
		label: "スワップメモリの管理",
		icon: MemoryStick,
		description: "メモリ不足時に補助的に使う領域を管理します。",
		group: "maintenance",
		apiStatus: "none",
	},
	{
		id: "disk-mounts",
		label: "ディスクのマウント管理",
		icon: HardDrive,
		description: "ディスクをどこに割り当てるかの設定を変更します(閲覧は「ストレージ」ページ参照)。",
		group: "maintenance",
		apiStatus: "none",
	},
	{
		id: "power-schedule",
		label: "電源管理・再起動スケジュール",
		icon: Power,
		description: "自動再起動やシャットダウンのスケジュールを管理します。",
		group: "maintenance",
		apiStatus: "none",
	},
	{
		id: "app-preferences",
		label: "アプリの表示設定",
		icon: Palette,
		description: "このアプリ(サーバー管理画面)の見た目や動作に関する設定です。",
		group: "app",
		apiStatus: "none",
	},
	{
		id: "api-update",
		label: "サーバー管理アプリの更新",
		icon: DownloadCloud,
		description: "サーバー上で動くAPIプログラムを最新版に更新します。",
		group: "maintenance",
		apiStatus: "ready",
	},
];
