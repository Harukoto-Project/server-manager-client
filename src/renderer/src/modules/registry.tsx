import { dockerModule } from "./docker";
import { gameServersModule } from "./game-servers";
import { networkModule } from "./network";
import { overviewModule } from "./overview";
import { processManagerModule } from "./process-manager";
import { storageModule } from "./storage";
import { systemSettingsModule } from "./system-settings";
import { systemdModule } from "./systemd";
import { terminalModule } from "./terminal";
import type { ModuleDefinition } from "./types";

/**
 * ノードダッシュボードのモジュール一覧。
 * 新しいページを追加する場合は該当モジュールを作成し、ここに1エントリ追加するだけでよい。
 * Sidebar・Routerはこの配列を描画するだけで、シェル自体には手を加えない。
 */
export const moduleRegistry: ModuleDefinition[] = [
	overviewModule,
	dockerModule,
	systemdModule,
	networkModule,
	storageModule,
	systemSettingsModule,
	gameServersModule,
	processManagerModule,
	terminalModule,
];

export function getVisibleModules(): ModuleDefinition[] {
	return [...moduleRegistry]
		.filter((module) => !module.hidden)
		.sort((a, b) => a.order - b.order);
}
