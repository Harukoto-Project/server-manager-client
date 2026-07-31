import { create } from "zustand";
import type { AppConfigSchema } from "../../../shared/config-schema";

type Preferences = AppConfigSchema["preferences"];

interface AppPreferencesState {
	preferences: Preferences | null;
	loaded: boolean;
	load: () => Promise<void>;
	update: (patch: Partial<Preferences>) => Promise<void>;
}

/**
 * アプリの表示設定(テーマ以外)。永続化はmainプロセスのconfig-store経由(nodes-storeと同じ方式)。
 * テーマ自体は`theme-provider.tsx`のuseThemeが管理するため、ここではサイドバー折りたたみ等を扱う。
 */
export const useAppPreferencesStore = create<AppPreferencesState>((set, get) => ({
	preferences: null,
	loaded: false,
	async load() {
		if (get().loaded) return;
		const config = await window.api.config.get();
		set({ preferences: config.preferences, loaded: true });
	},
	async update(patch) {
		const preferences = await window.api.config.setPreferences(patch);
		set({ preferences, loaded: true });
	},
}));
