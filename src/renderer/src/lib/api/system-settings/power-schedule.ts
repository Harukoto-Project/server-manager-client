import { type NodeAddress, NodeApiError, authorizedFetch, baseUrl } from "@renderer/lib/node-api-client";

export type PowerScheduleAction = "reboot" | "shutdown";

export interface PowerScheduleJob {
	jobId: string;
	time: string;
	action: PowerScheduleAction | "unknown";
	command: string;
}

export interface CreatePowerScheduleInput {
	action: PowerScheduleAction;
	time: string;
}

export async function fetchPowerSchedule(node: NodeAddress, token: string): Promise<PowerScheduleJob[]> {
	const response = await authorizedFetch(node, token, "/system-settings/power-schedule/schedule");
	const { jobs } = (await response.json()) as { jobs: PowerScheduleJob[] };
	return jobs;
}

export async function createPowerSchedule(
	node: NodeAddress,
	token: string,
	input: CreatePowerScheduleInput,
): Promise<{ ok: true; jobId: string | null; scheduledAt: string }> {
	const response = await authorizedFetch(node, token, "/system-settings/power-schedule/schedule", {
		method: "POST",
		body: input,
	});
	return response.json();
}

export async function cancelPowerSchedule(
	node: NodeAddress,
	token: string,
): Promise<{ ok: true; cancelledJobIds: string[] }> {
	const response = await authorizedFetch(node, token, "/system-settings/power-schedule/schedule", {
		method: "DELETE",
	});
	return response.json();
}

export { NodeApiError, baseUrl };
