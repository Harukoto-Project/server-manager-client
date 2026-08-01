import { type NodeAddress, NodeApiError, authorizedFetch, baseUrl } from "@renderer/lib/node-api-client";

export interface GameServerScheduleTask {
	id: number;
	sequenceId: number;
	action: "command" | "power" | "backup";
	payload: string;
	timeOffset: number;
}

export interface GameServerSchedule {
	id: number;
	name: string;
	cron: { minute: string; hour: string; dayOfWeek: string; dayOfMonth: string };
	isActive: boolean;
	isProcessing: boolean;
	lastRunAt: string | null;
	nextRunAt: string | null;
	tasks: GameServerScheduleTask[];
}

export interface CreateScheduleInput {
	name: string;
	minute: string;
	hour: string;
	dayOfWeek: string;
	dayOfMonth: string;
	isActive: boolean;
}

export type UpdateScheduleInput = Partial<CreateScheduleInput>;

export interface ScheduleTaskInput {
	action: "command" | "power" | "backup";
	payload: string;
	timeOffset: number;
}

/**
 * `node-api-client.ts`の`authorizedFetch`はGET/POST/DELETEのみ対応のため、
 * スケジュール/タスクの更新(PATCH)はここで同等のエラーハンドリングを持つ
 * 専用フェッチヘルパーを用意して対応する(共有ファイルは変更しない方針のため)。
 */
async function authorizedPatch(node: NodeAddress, token: string, path: string, body: unknown): Promise<Response> {
	let response: Response;
	try {
		response = await fetch(`${baseUrl(node)}${path}`, {
			method: "PATCH",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		});
	} catch {
		throw new NodeApiError("ノードに接続できません。ホスト/ポートやネットワーク(WireGuard等)を確認してください。");
	}
	if (response.status === 401) {
		throw new NodeApiError("アクセストークンが正しくありません。", 401);
	}
	if (!response.ok) {
		let message = `ノードからエラー応答がありました(HTTP ${response.status})`;
		try {
			const data = (await response.clone().json()) as { error?: string };
			if (data.error) message = data.error;
		} catch {
			// レスポンスボディがJSONでない場合はデフォルトメッセージを使う
		}
		throw new NodeApiError(message, response.status);
	}
	return response;
}

export async function fetchSchedules(node: NodeAddress, token: string, identifier: string): Promise<GameServerSchedule[]> {
	const response = await authorizedFetch(node, token, `/game-servers/schedules/${identifier}`);
	const { schedules } = (await response.json()) as { schedules: GameServerSchedule[] };
	return schedules;
}

export async function createSchedule(
	node: NodeAddress,
	token: string,
	identifier: string,
	input: CreateScheduleInput,
): Promise<GameServerSchedule> {
	const response = await authorizedFetch(node, token, `/game-servers/schedules/${identifier}`, {
		method: "POST",
		body: input,
	});
	const { schedule } = (await response.json()) as { schedule: GameServerSchedule };
	return schedule;
}

export async function updateSchedule(
	node: NodeAddress,
	token: string,
	identifier: string,
	scheduleId: number,
	input: UpdateScheduleInput,
): Promise<GameServerSchedule> {
	const response = await authorizedPatch(node, token, `/game-servers/schedules/${identifier}/${scheduleId}`, input);
	const { schedule } = (await response.json()) as { schedule: GameServerSchedule };
	return schedule;
}

export async function deleteSchedule(
	node: NodeAddress,
	token: string,
	identifier: string,
	scheduleId: number,
): Promise<void> {
	await authorizedFetch(node, token, `/game-servers/schedules/${identifier}/${scheduleId}`, { method: "DELETE" });
}

export async function createScheduleTask(
	node: NodeAddress,
	token: string,
	identifier: string,
	scheduleId: number,
	input: ScheduleTaskInput,
): Promise<GameServerScheduleTask> {
	const response = await authorizedFetch(node, token, `/game-servers/schedules/${identifier}/${scheduleId}/tasks`, {
		method: "POST",
		body: input,
	});
	const { task } = (await response.json()) as { task: GameServerScheduleTask };
	return task;
}

export async function updateScheduleTask(
	node: NodeAddress,
	token: string,
	identifier: string,
	scheduleId: number,
	taskId: number,
	input: Partial<ScheduleTaskInput>,
): Promise<GameServerScheduleTask> {
	const response = await authorizedPatch(
		node,
		token,
		`/game-servers/schedules/${identifier}/${scheduleId}/tasks/${taskId}`,
		input,
	);
	const { task } = (await response.json()) as { task: GameServerScheduleTask };
	return task;
}

export async function deleteScheduleTask(
	node: NodeAddress,
	token: string,
	identifier: string,
	scheduleId: number,
	taskId: number,
): Promise<void> {
	await authorizedFetch(node, token, `/game-servers/schedules/${identifier}/${scheduleId}/tasks/${taskId}`, {
		method: "DELETE",
	});
}

export { NodeApiError };
