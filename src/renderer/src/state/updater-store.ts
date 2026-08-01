import { create } from "zustand";
import type { UpdaterEvent } from "../../../shared/updater-events";

interface UpdaterState {
	appVersion: string | null;
	updaterEvent: UpdaterEvent | null;
	checking: boolean;
	subscribed: boolean;
	/** アプリ起動時に一度だけ呼び出し、バージョン取得とイベント購読を行う(`app-shell.tsx`から呼び出す想定)。 */
	init: () => void;
	checkForUpdates: () => Promise<void>;
}

const TIMEOUT_MS = 35_000;

/**
 * クライアント(アプリ本体)の更新状態をグローバルに保持するストア。
 *
 * checkForUpdates() は IPC 呼び出し後すぐに resolve するが、
 * 実際の結果はメインプロセスからのイベントで届く。
 * そのためイベントが届かない場合に備え、レンダラー側でもタイムアウトを管理する。
 */
export const useUpdaterStore = create<UpdaterState>((set, get) => {
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	function clearCheckTimeout() {
		if (timeoutId !== null) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
	}

	function startCheckTimeout() {
		clearCheckTimeout();
		timeoutId = setTimeout(() => {
			timeoutId = null;
			if (get().checking) {
				set({
					checking: false,
					updaterEvent: {
						type: "error",
						message: "更新確認がタイムアウトしました。ネットワーク接続を確認してください。",
					},
				});
			}
		}, TIMEOUT_MS);
	}

	return {
		appVersion: null,
		updaterEvent: null,
		checking: false,
		subscribed: false,
		init() {
			if (get().subscribed) return;
			set({ subscribed: true });
			void window.api.app.getVersion().then((appVersion) => set({ appVersion }));
			window.api.updater.onEvent((event) => {
				if (event.type !== "checking-for-update") {
					clearCheckTimeout();
				}
				set({ updaterEvent: event, checking: event.type === "checking-for-update" });
			});
		},
		async checkForUpdates() {
			set({ checking: true, updaterEvent: { type: "checking-for-update" } });
			startCheckTimeout();
			try {
				await window.api.updater.checkForUpdates();
			} catch (err) {
				clearCheckTimeout();
				set({
					checking: false,
					updaterEvent: {
						type: "error",
						message: err instanceof Error ? err.message : "更新の確認に失敗しました。",
					},
				});
			}
		},
	};
});
