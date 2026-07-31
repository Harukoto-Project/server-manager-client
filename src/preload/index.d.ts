import type { ElectronAPI } from "@electron-toolkit/preload";
import type { Api } from "./index.js";

declare global {
	interface Window {
		electron: ElectronAPI;
		api: Api;
	}
}
