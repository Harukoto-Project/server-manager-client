/**
 * main(auto-updater.ts)からrendererへ`updater:event`で送られる進捗イベントの型。
 * main/preload/rendererの全プロセスで共有する。
 */
export type UpdaterEvent =
	| { type: "checking-for-update" }
	| { type: "update-available"; version: string }
	| { type: "update-not-available"; version: string }
	| { type: "download-progress"; percent: number; transferred: number; total: number; bytesPerSecond: number }
	| { type: "update-downloaded"; version: string }
	| { type: "error"; message: string };
