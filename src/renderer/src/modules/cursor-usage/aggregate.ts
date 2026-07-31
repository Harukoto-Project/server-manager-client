import type { CursorUsageEventRow } from "./csv-parser";
import { calculateModelCostUsd, resolveModelPricing, type ResolvedModelPricing } from "./model-pricing";

export interface ModelAggregate {
	model: string;
	pricing: ResolvedModelPricing | null;
	events: number;
	inputWithoutCacheWrite: number;
	inputWithCacheWrite: number;
	cacheRead: number;
	outputTokens: number;
	totalTokens: number;
	/** 料金表にマッチした場合のみ算出、不明モデルは常に0 */
	costUsd: number;
}

export interface DailyAggregate {
	/** UTC日付(YYYY-MM-DD)。CSVのDate列(ISO8601)から日付部分のみを取り出したもの */
	date: string;
	totalTokens: number;
	costUsd: number;
	events: number;
}

export interface UsageReport {
	events: number;
	totalTokens: number;
	totalInputWithoutCacheWrite: number;
	totalInputWithCacheWrite: number;
	totalCacheRead: number;
	totalOutputTokens: number;
	/** 料金表にマッチしたモデルのみの合計(不明モデルは含まない) */
	totalCostUsd: number;
	unknownModelEvents: number;
	unknownModelTokens: number;
	/** totalTokens別の降順 */
	models: ModelAggregate[];
	/** 日付昇順 */
	daily: DailyAggregate[];
	dateRange: { from: string; to: string } | null;
}

function extractUtcDate(isoDate: string): string {
	const parsed = new Date(isoDate);
	if (Number.isNaN(parsed.getTime())) return "不明な日付";
	return parsed.toISOString().slice(0, 10);
}

export function buildUsageReport(rows: CursorUsageEventRow[]): UsageReport {
	const modelMap = new Map<string, ModelAggregate>();
	const dailyMap = new Map<string, DailyAggregate>();

	let totalTokens = 0;
	let totalInputWithoutCacheWrite = 0;
	let totalInputWithCacheWrite = 0;
	let totalCacheRead = 0;
	let totalOutputTokens = 0;
	let totalCostUsd = 0;
	let unknownModelEvents = 0;
	let unknownModelTokens = 0;
	let minDate: string | null = null;
	let maxDate: string | null = null;

	for (const row of rows) {
		totalTokens += row.totalTokens;
		totalInputWithoutCacheWrite += row.inputWithoutCacheWrite;
		totalInputWithCacheWrite += row.inputWithCacheWrite;
		totalCacheRead += row.cacheRead;
		totalOutputTokens += row.outputTokens;

		const resolved = resolveModelPricing(row.model);
		let costUsd = 0;
		if (resolved) {
			costUsd = calculateModelCostUsd(resolved.pricing, {
				inputWithoutCacheWrite: row.inputWithoutCacheWrite,
				inputWithCacheWrite: row.inputWithCacheWrite,
				cacheRead: row.cacheRead,
				outputTokens: row.outputTokens,
			}).totalCostUsd;
			totalCostUsd += costUsd;
		} else {
			unknownModelEvents += 1;
			unknownModelTokens += row.totalTokens;
		}

		const modelKey = row.model || "(不明)";
		const existing = modelMap.get(modelKey);
		if (existing) {
			existing.events += 1;
			existing.inputWithoutCacheWrite += row.inputWithoutCacheWrite;
			existing.inputWithCacheWrite += row.inputWithCacheWrite;
			existing.cacheRead += row.cacheRead;
			existing.outputTokens += row.outputTokens;
			existing.totalTokens += row.totalTokens;
			existing.costUsd += costUsd;
		} else {
			modelMap.set(modelKey, {
				model: modelKey,
				pricing: resolved,
				events: 1,
				inputWithoutCacheWrite: row.inputWithoutCacheWrite,
				inputWithCacheWrite: row.inputWithCacheWrite,
				cacheRead: row.cacheRead,
				outputTokens: row.outputTokens,
				totalTokens: row.totalTokens,
				costUsd,
			});
		}

		const dateKey = extractUtcDate(row.date);
		const existingDay = dailyMap.get(dateKey);
		if (existingDay) {
			existingDay.totalTokens += row.totalTokens;
			existingDay.costUsd += costUsd;
			existingDay.events += 1;
		} else {
			dailyMap.set(dateKey, { date: dateKey, totalTokens: row.totalTokens, costUsd, events: 1 });
		}

		if (dateKey !== "不明な日付") {
			if (!minDate || dateKey < minDate) minDate = dateKey;
			if (!maxDate || dateKey > maxDate) maxDate = dateKey;
		}
	}

	return {
		events: rows.length,
		totalTokens,
		totalInputWithoutCacheWrite,
		totalInputWithCacheWrite,
		totalCacheRead,
		totalOutputTokens,
		totalCostUsd,
		unknownModelEvents,
		unknownModelTokens,
		models: Array.from(modelMap.values()).sort((a, b) => b.totalTokens - a.totalTokens),
		daily: Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
		dateRange: minDate && maxDate ? { from: minDate, to: maxDate } : null,
	};
}
