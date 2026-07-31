import { app } from "electron";
import { mkdirSync } from "node:fs";
import path from "node:path";

/**
 * ローカル設定・キャッシュの保存先統一(Notion設計「ローカル設定・キャッシュの保存先統一」対応)。
 *
 * すべてのクライアント側ローカルデータ(プリファレンス・ノード一覧・キャッシュ・ログ・クラッシュダンプ)を
 * `%APPDATA%\Harukoto Project\Server Manager` 配下の1フォルダに集約する。
 * app.whenReady() より前に呼び出すことで、Electron/Chromiumが生成する各種キャッシュフォルダも
 * Roaming直下に分散させず、このフォルダ配下にまとめる。
 */
export function consolidateAppPaths(): string {
	const rootDir = path.join(app.getPath("appData"), "Harukoto Project", "Server Manager");
	mkdirSync(rootDir, { recursive: true });

	app.setPath("userData", rootDir);
	app.setPath("sessionData", rootDir);
	app.setPath("logs", path.join(rootDir, "Logs"));
	app.setPath("crashDumps", path.join(rootDir, "Crash Dumps"));
	app.setAppLogsPath(path.join(rootDir, "Logs"));

	return rootDir;
}
