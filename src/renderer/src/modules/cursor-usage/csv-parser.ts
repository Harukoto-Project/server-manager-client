/**
 * RFC4180に準拠したシンプルなCSVパーサー。
 * ダブルクォートで囲まれたフィールド内のカンマ・改行・エスケープされたクォート("")を正しく扱う。
 * Cursor Dashboardのusage-events CSVは各フィールドを常にダブルクォートで囲むが、
 * それ以外の一般的なCSVにも対応できるよう、クォートなしフィールドも許容する。
 */
function parseCsvRows(text: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = "";
	let inQuotes = false;

	// CRLF/CRを LF に統一してから1文字ずつ走査する
	const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

	for (let i = 0; i < normalized.length; i++) {
		const char = normalized[i];

		if (inQuotes) {
			if (char === '"') {
				if (normalized[i + 1] === '"') {
					field += '"';
					i++;
				} else {
					inQuotes = false;
				}
			} else {
				field += char;
			}
			continue;
		}

		if (char === '"') {
			inQuotes = true;
		} else if (char === ",") {
			row.push(field);
			field = "";
		} else if (char === "\n") {
			row.push(field);
			rows.push(row);
			row = [];
			field = "";
		} else {
			field += char;
		}
	}

	// 末尾に改行が無いファイルのために、残っているフィールド/行を回収する
	if (field.length > 0 || row.length > 0) {
		row.push(field);
		rows.push(row);
	}

	return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

export interface CursorUsageEventRow {
	date: string;
	cloudAgentId: string;
	automationId: string;
	kind: string;
	model: string;
	maxMode: boolean;
	inputWithCacheWrite: number;
	inputWithoutCacheWrite: number;
	cacheRead: number;
	outputTokens: number;
	totalTokens: number;
	/** CSV記載のCost列(USD)。User API Key利用時は0.00で記録されるため、概算コストには別途モデル料金表を使う */
	reportedCost: number;
}

const EXPECTED_HEADERS = [
	"Date",
	"Cloud Agent ID",
	"Automation ID",
	"Kind",
	"Model",
	"Max Mode",
	"Input (w/ Cache Write)",
	"Input (w/o Cache Write)",
	"Cache Read",
	"Output Tokens",
	"Total Tokens",
	"Cost",
];

function toNumber(value: string): number {
	const n = Number(value.trim());
	return Number.isFinite(n) ? n : 0;
}

export class CsvParseError extends Error {}

/**
 * Cursor Dashboardのusage-events CSVをパースする。
 * ヘッダーの並び順は変わらない前提だが、列名から位置を解決するため多少の順序変更には耐性がある。
 */
export function parseCursorUsageCsv(text: string): CursorUsageEventRow[] {
	const rows = parseCsvRows(text);
	if (rows.length === 0) {
		throw new CsvParseError("CSVファイルが空です。");
	}

	const header = rows[0].map((h) => h.trim());
	const missing = EXPECTED_HEADERS.filter((h) => !header.includes(h));
	if (missing.length > 0) {
		throw new CsvParseError(
			`想定したCursor usage-events CSVのヘッダーと一致しません。不足している列: ${missing.join(", ")}`,
		);
	}

	const indexOf = (name: string) => header.indexOf(name);
	const idx = {
		date: indexOf("Date"),
		cloudAgentId: indexOf("Cloud Agent ID"),
		automationId: indexOf("Automation ID"),
		kind: indexOf("Kind"),
		model: indexOf("Model"),
		maxMode: indexOf("Max Mode"),
		inputWithCacheWrite: indexOf("Input (w/ Cache Write)"),
		inputWithoutCacheWrite: indexOf("Input (w/o Cache Write)"),
		cacheRead: indexOf("Cache Read"),
		outputTokens: indexOf("Output Tokens"),
		totalTokens: indexOf("Total Tokens"),
		cost: indexOf("Cost"),
	};

	const dataRows = rows.slice(1).filter((r) => r.some((cell) => cell.trim() !== ""));

	return dataRows.map((r) => ({
		date: r[idx.date] ?? "",
		cloudAgentId: r[idx.cloudAgentId] ?? "",
		automationId: r[idx.automationId] ?? "",
		kind: r[idx.kind] ?? "",
		model: r[idx.model] ?? "",
		maxMode: (r[idx.maxMode] ?? "").trim().toLowerCase() === "yes",
		inputWithCacheWrite: toNumber(r[idx.inputWithCacheWrite] ?? "0"),
		inputWithoutCacheWrite: toNumber(r[idx.inputWithoutCacheWrite] ?? "0"),
		cacheRead: toNumber(r[idx.cacheRead] ?? "0"),
		outputTokens: toNumber(r[idx.outputTokens] ?? "0"),
		totalTokens: toNumber(r[idx.totalTokens] ?? "0"),
		reportedCost: toNumber(r[idx.cost] ?? "0"),
	}));
}
