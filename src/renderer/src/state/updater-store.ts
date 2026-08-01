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

/**
 * クライアント(アプリ本体)の更新状態をグローバルに保持するストア。
 * `window.api.updater.onEvent()`の購読を`app-shell.tsx`で一度だけ行うことで、
 * サイドバーのような常時マウントされるコンポーネントからも最新の更新状態を参照できるようにする。
 */
export const useUpdaterStore = create<UpdaterState>((set, get) => ({
	appVersion: null,
	updaterEvent: null,
	checking: false,
	subscribed: false,
	init() {
		if (get().subscribed) return;
		set({ subscribed: true });
		void window.api.app.getVersion().then((appVersion) => set({ appVersion }));
		window.api.updater.onEvent((event) => {
			set({ updaterEvent: event, checking: event.type === "checking-for-update" });
		});
	},
	async checkForUpdates() {
		set({ checking: true, updaterEvent: { type: "checking-for-update" } });
		try {
			await window.api.updater.checkForUpdates();
		} catch (err) {
			set({
				checking: false,
				updaterEvent: {
					type: "error",
					message: err instanceof Error ? err.message : "更新の確認に失敗しました。",
				},
			});
		}
	},
}));
