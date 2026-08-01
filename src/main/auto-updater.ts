import https from "node:https";
import { is } from "@electron-toolkit/utils";
import { type BrowserWindow, app, ipcMain } from "electron";
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
				if (!is.dev) void startElectronUpdaterDownload(send);
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

	async function startElectronUpdaterDownload(
		sendFn: (event: UpdaterEvent) => void,
	): Promise<void> {
		try {
			const { autoUpdater } = await import("electron-updater");
			autoUpdater.autoDownload = true;
			autoUpdater.autoInstallOnAppQuit = false;
			autoUpdater.on("download-progress", (p) => {
				sendFn({
					type: "download-progress",
					percent: p.percent,
					transferred: p.transferred,
					total: p.total,
					bytesPerSecond: p.bytesPerSecond,
				});
			});
			autoUpdater.on("update-downloaded", (info) => {
				sendFn({ type: "update-downloaded", version: info.version });
			});
			autoUpdater.on("error", (error) => {
				sendFn({ type: "error", message: error.message });
			});
			await autoUpdater.downloadUpdate();
		} catch (err) {
			sendFn({
				type: "error",
				message: `ダウンロードエラー: ${err instanceof Error ? err.message : String(err)}`,
			});
		}
	}

	let doInstall: () => void = () => {};

	const initPromise = is.dev
		? Promise.resolve()
		: import("electron-updater")
				.then(({ autoUpdater }) => {
					doInstall = () => autoUpdater.quitAndInstall();
				})
				.catch(() => {});

	ipcMain.handle("updater:check-for-updates", async () => {
		await initPromise;
		await checkViaGitHubApi();
	});
	ipcMain.handle("updater:quit-and-install", async () => {
		await initPromise;
		doInstall();
	});

	await initPromise;
	setTimeout(() => void checkViaGitHubApi(), 4_000);
}
