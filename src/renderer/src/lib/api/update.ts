import { type NodeAddress, authorizedFetch } from "@renderer/lib/node-api-client";

export interface ApiUpdateStepResult {
	step: string;
	ok: boolean;
	stdout: string;
	stderr: string;
}

export type ApiUpdateResult =
	| { ok: true; steps: ApiUpdateStepResult[] }
	| { ok: false; steps: ApiUpdateStepResult[]; failedStep: string };

export async function triggerApiUpdate(
	node: NodeAddress,
	token: string,
	installPath: string,
	serviceName?: string,
): Promise<ApiUpdateResult> {
	const response = await authorizedFetch(node, token, "/update/run", {
		method: "POST",
		body: { installPath, ...(serviceName ? { serviceName } : {}) },
		signal: AbortSignal.timeout(600_000),
	});
	return response.json();
}
