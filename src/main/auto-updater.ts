import { is } from "@electron-toolkit/utils";
import { type BrowserWindow, ipcMain } from "electron";
import type { UpdaterEvent } from "../shared/updater-events.js";

/**
 * electron-updater(GitHub Releases)を使ったアプリ本体の自動更新ロジック。
 * 開発時(is.dev)はローカル未署名ビルドでの誤動作を避けるため一切チェックしない。
 *
 * IPC ハンドラーを動的インポートより先に登録し、初期化完了を Promise で待つことで
 * 「No handler registered」および「初期化未完了」エラーを防ぐ。
 */
export async function setupAutoUpdater(mainWindow: BrowserWindow): Promise<void> {
	function send(event: UpdaterEvent): void {
		mainWindow.webContents.send("updater:event", event);
	}

	if (is.dev) {
		ipcMain.handle("updater:check-for-updates", () => {
			send({ type: "error", message: "開発モードでは自動更新の確認はできません。" });
		});
		ipcMain.handle("updater:quit-and-install", () => {});
		return;
	}

	type CheckFn = () => Promise<void>;
	type InstallFn = () => void;

	let doCheck: CheckFn = async () => {};
	let doInstall: InstallFn = () => {};

	const initPromise = import("electron-updater")
		.then(({ autoUpdater }) => {
			autoUpdater.autoDownload = true;
			autoUpdater.autoInstallOnAppQuit = false;

			autoUpdater.on("checking-for-update", () => {
				send({ type: "checking-for-update" });
			});
			autoUpdater.on("update-available", (info) => {
				send({ type: "update-available", version: info.version });
			});
			autoUpdater.on("update-not-available", (info) => {
				send({ type: "update-not-available", version: info.version });
			});
			autoUpdater.on("download-progress", (progress) => {
				send({
					type: "download-progress",
					percent: progress.percent,
					transferred: progress.transferred,
					total: progress.total,
					bytesPerSecond: progress.bytesPerSecond,
				});
			});
			autoUpdater.on("update-downloaded", (info) => {
				send({ type: "update-downloaded", version: info.version });
			});
			autoUpdater.on("error", (error) => {
				send({ type: "error", message: error.message });
			});

			doCheck = async () => {
				const timeout = new Promise<never>((_, reject) =>
					setTimeout(
						() => reject(new Error("更新確認がタイムアウトしました。ネットワーク接続を確認してください。")),
						30_000,
					),
				);
				await Promise.race([autoUpdater.checkForUpdates(), timeout]).catch((err: unknown) => {
					send({ type: "error", message: err instanceof Error ? err.message : String(err) });
				});
			};
			doInstall = () => autoUpdater.quitAndInstall();
		})
		.catch((err: unknown) => {
			send({
				type: "error",
				message: `自動更新の初期化に失敗しました: ${err instanceof Error ? err.message : String(err)}`,
			});
		});

	ipcMain.handle("updater:check-for-updates", async () => {
		await initPromise;
		await doCheck();
	});
	ipcMain.handle("updater:quit-and-install", async () => {
		await initPromise;
		doInstall();
	});

	await initPromise;
	await doCheck();
}
