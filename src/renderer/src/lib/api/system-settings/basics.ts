import { type NodeAddress, authorizedFetch } from "@renderer/lib/node-api-client";

export interface SystemSettingsLocaleInfo {
	locales: string[];
	currentLang: string;
}

export interface UpdateLocaleResult {
	ok: true;
	locale: string;
	requiresRestart: boolean;
	message: string;
}

export async function updateHostname(node: NodeAddress, token: string, hostname: string): Promise<{ ok: true; hostname: string }> {
	const response = await authorizedFetch(node, token, "/system-settings/basics/hostname", {
		method: "POST",
		body: { hostname },
	});
	return response.json();
}

export async function fetchTimezones(node: NodeAddress, token: string): Promise<string[]> {
	const response = await authorizedFetch(node, token, "/system-settings/basics/timezones");
	const { timezones } = (await response.json()) as { timezones: string[] };
	return timezones;
}

export async function updateTimezone(node: NodeAddress, token: string, timezone: string): Promise<{ ok: true; timezone: string }> {
	const response = await authorizedFetch(node, token, "/system-settings/basics/timezone", {
		method: "POST",
		body: { timezone },
	});
	return response.json();
}

export async function fetchLocaleInfo(node: NodeAddress, token: string): Promise<SystemSettingsLocaleInfo> {
	const response = await authorizedFetch(node, token, "/system-settings/locale");
	return response.json();
}

export async function updateLocale(node: NodeAddress, token: string, locale: string): Promise<UpdateLocaleResult> {
	const response = await authorizedFetch(node, token, "/system-settings/locale", {
		method: "POST",
		body: { locale },
	});
	return response.json();
}

export async function applyAptUpgrade(node: NodeAddress, token: string): Promise<{ ok: true; output: string }> {
	const response = await authorizedFetch(node, token, "/system-settings/apt/upgrade", { method: "POST" });
	return response.json();
}
