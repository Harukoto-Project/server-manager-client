import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { BrowserWindow, app, dialog, ipcMain, session, shell } from "electron";
import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { consolidateAppPaths } from "./paths.js";

const rootDir = consolidateAppPaths();

const MIME: Record<string, string> = {
	".html": "text/html",
	".js": "application/javascript",
	".css": "text/css",
	".svg": "image/svg+xml",
	".png": "image/png",
	".ico": "image/x-icon",
	".woff2": "font/woff2",
	".woff": "font/woff",
	".ttf": "font/ttf",
	".json": "application/json",
	".map": "application/json",
};

function startLocalServer(distPath: string): Promise<number> {
	return new Promise((resolve, reject) => {
		const server = http.createServer((req, res) => {
			const urlPath = (req.url ?? "/").split("?")[0];
			let filePath = path.join(distPath, urlPath === "/" ? "index.html" : urlPath);
			if (!fs.existsSync(filePath)) {
				filePath = path.join(distPath, "index.html");
			}
			const ext = path.extname(filePath);
			const contentType = MIME[ext] ?? "application/octet-stream";
			try {
				const content = fs.readFileSync(filePath);
				res.writeHead(200, { "Content-Type": contentType });
				res.end(content);
			} catch {
				res.writeHead(404);
				res.end("Not found");
			}
		});
		server.listen(0, "127.0.0.1", () => {
			resolve((server.address() as AddressInfo).port);
		});
		server.on("error", reject);
	});
}

function normalizeElectronFingerprint(fingerprint: string): string {
	if (fingerprint.startsWith("sha256/")) {
		const base64 = fingerprint.slice(7);
		const hex = Buffer.from(base64, "base64").toString("hex").toUpperCase();
		return (hex.match(/.{2}/g) ?? []).join(":");
	}
	return fingerprint.toUpperCase();
}

async function bootstrap() {
	const { createConfigStore } = await import("./config-store.js");
	const { SecureTokenStore } = await import("./secure-store.js");
	const { registerIpcHandlers } = await import("./ipc.js");
	const { setupAutoUpdater } = await import("./auto-updater.js");

	const config = createConfigStore(rootDir);
	const secureStore = new SecureTokenStore(rootDir);
	registerIpcHandlers(ipcMain, config, secureStore);

	const mismatchAlertedNodes = new Set<string>();
	let appURL = "";

	app.on("certificate-error", (event, _webContents, url, _error, certificate, callback) => {
		event.preventDefault();

		let urlHost: string;
		let urlPort: number;
		try {
			const parsed = new URL(url);
			urlHost = parsed.hostname;
			urlPort = parsed.port ? parseInt(parsed.port, 10) : 443;
		} catch {
			callback(false);
			return;
		}

		const nodes = config.get("nodes");
		const node = nodes.find((n) => n.host === urlHost && n.port === urlPort && n.tlsEnabled);

		if (!node?.certFingerprint) {
			callback(false);
			return;
		}

		const incoming = normalizeElectronFingerprint(certificate.fingerprint);
		if (incoming === node.certFingerprint) {
			callback(true);
			return;
		}

		callback(false);

		if (!mismatchAlertedNodes.has(node.id)) {
			mismatchAlertedNodes.add(node.id);
			void dialog
				.showMessageBox({
					type: "warning",
					title: "セキュリティ警告 — 証明書不一致",
					message: `ノード「${node.name}」の証明書が変わっています`,
					detail:
						"接続先の証明書が登録済みのフィンガープリントと一致しません。\n" +
						"VPN (WireGuard) 経由で接続しているか確認してください。\n\n" +
						"ノードが正規のものであれば、ノード編集画面から証明書フィンガープリントを更新してください。",
					buttons: ["OK"],
				})
				.then(() => {
					mismatchAlertedNodes.delete(node.id);
				});
		}
	});

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

		mainWindow.loadURL(appURL);

		if (!autoUpdaterInitialized) {
			autoUpdaterInitialized = true;
			void setupAutoUpdater(mainWindow);
		}
	}

	app.whenReady().then(async () => {
		electronApp.setAppUserModelId("com.harukoto-project.server-manager");

		if (is.dev && process.env.ELECTRON_RENDERER_URL) {
			appURL = process.env.ELECTRON_RENDERER_URL;
		} else {
			const distPath = path.join(__dirname, "../renderer");
			const port = await startLocalServer(distPath);
			appURL = `http://localhost:${port}`;
		}

		const csp = is.dev
			? "default-src 'self' http://localhost:* ws://localhost:*; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http: https: ws: wss:;"
			: "default-src 'self' http://localhost:*; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http: https: ws: wss:;";

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
