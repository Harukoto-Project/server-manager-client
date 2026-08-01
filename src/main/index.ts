import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { BrowserWindow, app, ipcMain, net, protocol, session, shell } from "electron";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { consolidateAppPaths } from "./paths.js";

const rootDir = consolidateAppPaths();

protocol.registerSchemesAsPrivileged([
	{ scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);

async function bootstrap() {
	const { createConfigStore } = await import("./config-store.js");
	const { SecureTokenStore } = await import("./secure-store.js");
	const { registerIpcHandlers } = await import("./ipc.js");
	const { setupAutoUpdater } = await import("./auto-updater.js");

	const config = createConfigStore(rootDir);
	const secureStore = new SecureTokenStore(rootDir);
	registerIpcHandlers(ipcMain, config, secureStore);

	let autoUpdaterInitialized = false;

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

		mainWindow.removeMenu();
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
			mainWindow.loadURL("app://server-manager/index.html");
		}

		if (!autoUpdaterInitialized) {
			autoUpdaterInitialized = true;
			void setupAutoUpdater(mainWindow);
		}
	}

	app.whenReady().then(() => {
		electronApp.setAppUserModelId("com.harukoto-project.server-manager");

		protocol.handle("app", (req) => {
			const url = new URL(req.url);
			if (url.hostname !== "server-manager") {
				return new Response("Not found", { status: 404 });
			}
			let filePath = url.pathname;
			if (filePath === "/" || filePath === "") {
				filePath = "/index.html";
			}
			const rendererPath = path.join(__dirname, "../renderer", filePath);
			return net.fetch(pathToFileURL(rendererPath).toString());
		});

		const csp = is.dev
			? "default-src 'self' http://localhost:* ws://localhost:*; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http: https: ws: wss:;"
			: "default-src 'self' app://server-manager; script-src 'self' app://server-manager; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http: https: ws: wss:;";

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
