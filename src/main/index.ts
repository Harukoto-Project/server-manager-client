import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { BrowserWindow, app, ipcMain, session, shell } from "electron";
import path from "node:path";
import { consolidateAppPaths } from "./paths.js";

// app.whenReady() より前に必ず呼び出し、ユーザーデータ/キャッシュ/ログ/クラッシュダンプの
// 保存先を %APPDATA%\Harukoto Project\Server Manager 配下に一本化する。
const rootDir = consolidateAppPaths();

async function bootstrap() {
	// 動的importにしているのは、consolidateAppPathsの後でelectron-store系のパス解決を行うため
	const { createConfigStore } = await import("./config-store.js");
	const { SecureTokenStore } = await import("./secure-store.js");
	const { registerIpcHandlers } = await import("./ipc.js");

	const config = createConfigStore(rootDir);
	const secureStore = new SecureTokenStore(rootDir);
	registerIpcHandlers(ipcMain, config, secureStore);

	function createMainWindow(): void {
		const { width, height } = config.get("window");

		const mainWindow = new BrowserWindow({
			width,
			height,
			minWidth: 960,
			minHeight: 600,
			show: false,
			autoHideMenuBar: true,
			backgroundColor: "#00000000",
			titleBarStyle: "hiddenInset",
			webPreferences: {
				preload: path.join(__dirname, "../preload/index.js"),
				sandbox: false,
				contextIsolation: true,
				nodeIntegration: false,
			},
		});

		mainWindow.on("ready-to-show", () => mainWindow.show());
		mainWindow.on("resized", () => {
			const [w, h] = mainWindow.getSize();
			config.set("window", { width: w, height: h });
		});

		mainWindow.webContents.setWindowOpenHandler((details) => {
			shell.openExternal(details.url);
			return { action: "deny" };
		});

		if (is.dev && process.env.ELECTRON_RENDERER_URL) {
			mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
		} else {
			mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
		}
	}

	app.whenReady().then(() => {
		electronApp.setAppUserModelId("com.harukoto-project.server-manager");

		// CSPを設定し外部スクリプトの読み込みを禁止する(Notion「Electron(Windows側)の堅牢化」対応)。
		// 開発時はVite Dev Server + React Refreshがインラインスクリプト/evalを必要とするため緩め、
		// 本番ビルド(file://で読み込む静的アセットのみ)では厳格なCSPを適用する。
		// connect-src の http:/ws: は、WireGuardトンネル内のノード(server-manager-api)へ
		// 平文HTTP/WSで到達するために許可している(トンネル自体で暗号化されている前提。V1の暫定方針)。
		const csp = is.dev
			? "default-src 'self' http://localhost:* ws://localhost:*; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http: https: ws: wss:;"
			: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http: https: ws: wss:;";

		session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
			callback({
				responseHeaders: {
					...details.responseHeaders,
					"Content-Security-Policy": [csp],
				},
			});
		});

		app.on("browser-window-created", (_, window) => optimizer.watchWindowShortcuts(window));

		createMainWindow();

		app.on("activate", () => {
			if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
		});
	});
}

bootstrap();

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
