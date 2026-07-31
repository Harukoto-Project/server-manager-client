import { is } from "@electron-toolkit/utils";
import { type BrowserWindow, ipcMain } from "electron";
import type { UpdaterEvent } from "../shared/updater-events.js";

/**
 * electron-updater(GitHub Releases)を使ったアプリ本体の自動更新ロジック。
 * 開発時(is.dev)はローカル未署名ビルドでの誤動作を避けるため一切チェックしない。
 */
export async function setupAutoUpdater(mainWindow: BrowserWindow): Promise<void> {
	function send(event: UpdaterEvent): void {
		mainWindow.webContents.send("updater:event", event);
	}

	if (is.dev) {
		ipcMain.handle("updater:check-for-updates", () => {
			send({ type: "error", message: "開発モードでは自動更新の確認はできません。" });
		});
		ipcMain.handle("updater:quit-and-install", () => {
			// 開発モードでは何もしない
		});
		return;
	}

	const { autoUpdater } = await import("electron-updater");
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

	ipcMain.handle("updater:check-for-updates", async () => {
		await autoUpdater.checkForUpdates();
	});

	ipcMain.handle("updater:quit-and-install", () => {
		autoUpdater.quitAndInstall();
	});

	await autoUpdater.checkForUpdates();
}
