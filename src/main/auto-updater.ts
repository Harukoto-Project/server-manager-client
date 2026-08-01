import https from "node:https";
import { is } from "@electron-toolkit/utils";
import { type BrowserWindow, app, ipcMain } from "electron";
import type { AppUpdater } from "electron-updater";
import type { UpdaterEvent } from "../shared/updater-events.js";

const GITHUB_OWNER = "Harukoto-Project";
const GITHUB_REPO = "server-manager-client";
const RELEASES_API_HOST = "api.github.com";
const RELEASES_API_PATH = `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

/**
 * アプリ本体の自動更新ロジック。
 *
 * 更新確認は Node.js https モジュールで GitHub API を直接叩く(dev/prod 共通)。
 * 実際のダウンロード・インストールは electron-updater に委譲する(prod のみ)。
 */
export async function setupAutoUpdater(mainWindow: BrowserWindow): Promise<void> {
	function send(event: UpdaterEvent): void {
		if (!mainWindow.isDestroyed()) {
			mainWindow.webContents.send("updater:event", event);
		}
	}

	function fetchLatestRelease(): Promise<{ tag_name: string }> {
		return new Promise((resolve, reject) => {
			const req = https.get(
				{
					hostname: RELEASES_API_HOST,
					path: RELEASES_API_PATH,
					headers: {
						"User-Agent": `${GITHUB_REPO}/${app.getVersion()}`,
						Accept: "application/vnd.github+json",
					},
					timeout: 15_000,
				},
				(res) => {
					if (res.statusCode !== 200) {
						reject(new Error(`GitHub API エラー: ${res.statusCode} ${res.statusMessage}`));
						res.resume();
						return;
					}
					let body = "";
					res.setEncoding("utf8");
					res.on("data", (chunk: string) => {
						body += chunk;
					});
					res.on("end", () => {
						try {
							resolve(JSON.parse(body) as { tag_name: string });
						} catch {
							reject(new Error("レスポンスの解析に失敗しました。"));
						}
					});
				},
			);
			req.on("timeout", () => {
				req.destroy();
				reject(new Error("GitHub API への接続がタイムアウトしました (15秒)。"));
			});
			req.on("error", (err) => reject(err));
		});
	}

	function compareVersions(a: string, b: string): number {
		const parse = (v: string) => v.split(".").map(Number);
		const [a1 = 0, a2 = 0, a3 = 0] = parse(a);
		const [b1 = 0, b2 = 0, b3 = 0] = parse(b);
		return a1 !== b1 ? a1 - b1 : a2 !== b2 ? a2 - b2 : a3 - b3;
	}

	async function checkViaGitHubApi(): Promise<void> {
		send({ type: "checking-for-update" });
		try {
			const data = await fetchLatestRelease();
			const latestVersion = (data.tag_name ?? "").replace(/^v/, "");
			const currentVersion = app.getVersion();

			if (!latestVersion) {
				send({ type: "error", message: "リリース情報の取得に失敗しました。" });
				return;
			}

			if (compareVersions(latestVersion, currentVersion) > 0) {
				send({ type: "update-available", version: latestVersion });
				if (!is.dev) void startDownload(latestVersion);
			} else {
				send({ type: "update-not-available", version: currentVersion });
			}
		} catch (err) {
			send({
				type: "error",
				message: err instanceof Error ? err.message : String(err),
			});
		}
	}

	// electron-updater は prod のみ、一度だけインポートして参照を保持する
	let cachedAutoUpdater: AppUpdater | null = null;

	async function getAutoUpdater(): Promise<AppUpdater | null> {
		if (is.dev) return null;
		if (cachedAutoUpdater) return cachedAutoUpdater;
		try {
			const mod = await import("electron-updater");
			cachedAutoUpdater = mod.autoUpdater;
			return cachedAutoUpdater;
		} catch {
			return null;
		}
	}

	async function startDownload(_version: string): Promise<void> {
		const autoUpdater = await getAutoUpdater();
		if (!autoUpdater) return;

		try {
			autoUpdater.autoDownload = false;
			autoUpdater.autoInstallOnAppQuit = false;

			autoUpdater.removeAllListeners();
			autoUpdater.on("download-progress", (p) => {
				send({
					type: "download-progress",
					percent: p.percent,
					transferred: p.transferred,
					total: p.total,
					bytesPerSecond: p.bytesPerSecond,
				});
			});
			autoUpdater.on("update-downloaded", (info) => {
				send({ type: "update-downloaded", version: info.version });
			});
			autoUpdater.on("error", (error) => {
				send({ type: "error", message: error.message });
			});

			await autoUpdater.downloadUpdate();
		} catch (err) {
			send({
				type: "error",
				message: `ダウンロードエラー: ${err instanceof Error ? err.message : String(err)}`,
			});
		}
	}

	ipcMain.handle("updater:check-for-updates", () => checkViaGitHubApi());
	ipcMain.handle("updater:quit-and-install", async () => {
		const autoUpdater = await getAutoUpdater();
		autoUpdater?.quitAndInstall();
	});

	setTimeout(() => void checkViaGitHubApi(), 4_000);
}
