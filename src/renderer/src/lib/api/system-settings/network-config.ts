import { type NodeAddress, NodeApiError, authorizedFetch, baseUrl } from "@renderer/lib/node-api-client";

export type DnsServersSource = "systemd-resolved" | "resolv.conf" | "unknown";

export interface DnsServersInfo {
	source: DnsServersSource;
	servers: string[];
	raw: string;
	error?: string;
}

export interface InterfacesConfigFile {
	file: string;
	content: string;
}

export type InterfacesConfigSource = "netplan" | "interfaces" | "unknown";

export interface InterfacesConfigInfo {
	source: InterfacesConfigSource;
	files: InterfacesConfigFile[];
	error?: string;
}

export async function fetchDnsServers(node: NodeAddress, token: string): Promise<DnsServersInfo> {
	const response = await authorizedFetch(node, token, "/system-settings/network-config/dns-servers");
	return response.json();
}

export async function updateDnsServers(node: NodeAddress, token: string, servers: string[]): Promise<{ ok: true }> {
	const response = await authorizedFetch(node, token, "/system-settings/network-config/dns-servers", {
		method: "POST",
		body: { servers },
	});
	return response.json();
}

export async function fetchInterfacesConfig(node: NodeAddress, token: string): Promise<InterfacesConfigInfo> {
	const response = await authorizedFetch(node, token, "/system-settings/network-config/interfaces-config");
	return response.json();
}

export { NodeApiError, baseUrl };
