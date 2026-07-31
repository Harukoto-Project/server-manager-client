import { type NodeAddress, NodeApiError, authorizedFetch, baseUrl } from "@renderer/lib/node-api-client";

export interface CronJobEntry {
	index: number;
	schedule: string;
	command: string;
	raw: string;
}

export interface CreateCronJobInput {
	schedule: string;
	command: string;
}

export async function fetchCronJobs(node: NodeAddress, token: string): Promise<CronJobEntry[]> {
	const response = await authorizedFetch(node, token, "/system-settings/scheduled-tasks/cron-jobs");
	const { jobs } = (await response.json()) as { jobs: CronJobEntry[] };
	return jobs;
}

export async function createCronJob(
	node: NodeAddress,
	token: string,
	input: CreateCronJobInput,
): Promise<{ ok: true; index: number }> {
	const response = await authorizedFetch(node, token, "/system-settings/scheduled-tasks/cron-jobs", {
		method: "POST",
		body: input,
	});
	return response.json();
}

export async function deleteCronJob(node: NodeAddress, token: string, index: number): Promise<{ ok: true }> {
	const response = await authorizedFetch(node, token, `/system-settings/scheduled-tasks/cron-jobs/${index}`, {
		method: "DELETE",
	});
	return response.json();
}

export { NodeApiError, baseUrl };
