export interface PlaceholderProject {
	id: string;
	name: string;
	kind: "node" | "python";
	status: "running" | "stopped";
	cwd: string;
	command: string;
}

/**
 * server-manager-api の process-manager モジュールはWebSocketコンソール配信まで実装済みだが、
 * クライアント側はまだ実接続しておらず、プレースホルダーデータで画面構造のみ確認できる状態(Notion進捗レポート参照)。
 */
export const placeholderProjects: PlaceholderProject[] = [
	{ id: "1", name: "discord-bot", kind: "node", status: "running", cwd: "/opt/projects/discord-bot", command: "node index.js" },
	{
		id: "2",
		name: "backup-scheduler",
		kind: "python",
		status: "stopped",
		cwd: "/opt/projects/backup-scheduler",
		command: "python main.py",
	},
];
