import Conf from "conf";
import yaml from "js-yaml";
import type { AppConfigSchema } from "../shared/config-schema.js";

export type { AppConfigSchema, NodeEntry, ThemePreference } from "../shared/config-schema.js";

const defaults: AppConfigSchema = {
	preferences: {
		theme: "system",
		locale: "ja",
		sidebarCollapsed: false,
		reducedMotionOverride: null,
	},
	window: {
		width: 1280,
		height: 800,
	},
	lastSelectedNodeId: null,
	nodes: [],
};

/**
 * `%APPDATA%\Harukoto Project\Server Manager\config.yml` にYAML形式で永続化する設定ストア。
 * セッショントークン等の機微情報はここには保存しない(secure-store.ts側でOSのセキュアストレージを使う)。
 */
export function createConfigStore(rootDir: string) {
	return new Conf<AppConfigSchema>({
		cwd: rootDir,
		configName: "config",
		fileExtension: "yml",
		serialize: (value) => yaml.dump(value),
		deserialize: (text) => yaml.load(text) as AppConfigSchema,
		defaults,
		clearInvalidConfig: false,
	});
}

export type ConfigStore = ReturnType<typeof createConfigStore>;
