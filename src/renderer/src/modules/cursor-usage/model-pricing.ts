/**
 * CursorのusageイベントCSVに現れる`Model`列の文字列(例: "claude-sonnet-5-thinking-high")から
 * モデルファミリーを推測し、各社が公開しているAPI料金(1Mトークンあたり、USD)で概算コストを計算するための料金表。
 *
 * Cursor自体の課金(サブスクリプション/クレジット消費)とは無関係に、
 * 「もし各モデルを提供元のAPIで直接呼んだ場合の価格」を概算するためのテーブルであり、
 * `Kind`が"User API Key"の行でCost列が0.00になる問題を補うことが目的。
 *
 * 料金の出典(2026年7月時点で確認、料金は変動するため利用時に各社公式ページで要確認):
 * - Anthropic Claude: https://platform.claude.com/docs/en/about-claude/pricing
 * - OpenAI GPT: https://openai.com/api/pricing/ (2026年7月時点のGPT-5.4/5.5/5.6系レート)
 * - Google Gemini: https://ai.google.dev/gemini-api/docs/pricing
 * - xAI Grok: https://docs.x.ai/developers/pricing
 * - DeepSeek: https://api-docs.deepseek.com/quick_start/pricing/
 */

/** USD→JPY換算の固定レート(概算表示用。実際の為替レートとは異なる場合がある) */
export const USD_TO_JPY_RATE = 158;

export interface ModelPricing {
	/** UI表示用のモデルファミリー名 */
	displayName: string;
	/** グラフの凡例等で使う大分類(Claude/GPT/Gemini/Grok/DeepSeek/その他) */
	vendor: string;
	/** 新規入力トークン(キャッシュ書き込みを伴わない)の単価: USD / 1Mトークン */
	inputPerMTok: number;
	/** キャッシュへの書き込みを伴う入力トークンの単価: USD / 1Mトークン(公開値が無い場合はinputPerMTokと同額) */
	cacheWritePerMTok: number;
	/** キャッシュから読み込まれたトークンの単価: USD / 1Mトークン */
	cacheReadPerMTok: number;
	/** 出力トークンの単価: USD / 1Mトークン */
	outputPerMTok: number;
	/** 料金の出典URL */
	sourceUrl: string;
	/** 料金表に関する補足(前提条件・近似の説明など) */
	note?: string;
}

interface ModelPricingRule {
	test: RegExp;
	pricing: ModelPricing;
}

const ANTHROPIC_SOURCE = "https://platform.claude.com/docs/en/about-claude/pricing";
const OPENAI_SOURCE = "https://openai.com/api/pricing/";
const GEMINI_SOURCE = "https://ai.google.dev/gemini-api/docs/pricing";
const GROK_SOURCE = "https://docs.x.ai/developers/pricing";
const DEEPSEEK_SOURCE = "https://api-docs.deepseek.com/quick_start/pricing/";

/**
 * ルールは配列の先頭から順にマッチングし、最初に一致したものを採用する(=先に書くほど優先度が高い)。
 * "sonnet-5"のような具体的なバージョンを"sonnet"のような広いパターンより先に置くことで、
 * 誤って新しいモデルを古い世代の料金に丸めてしまわないようにしている。
 */
const MODEL_PRICING_RULES: ModelPricingRule[] = [
	// --- Anthropic Claude ---
	{
		test: /claude[-_.]?opus/i,
		pricing: {
			displayName: "Claude Opus (4.5〜5系)",
			vendor: "Claude",
			inputPerMTok: 5,
			cacheWritePerMTok: 6.25,
			cacheReadPerMTok: 0.5,
			outputPerMTok: 25,
			sourceUrl: ANTHROPIC_SOURCE,
			note: "キャッシュ書き込みは5分TTL($6.25/MTok)を採用",
		},
	},
	{
		test: /claude[-_.]?fable/i,
		pricing: {
			displayName: "Claude Fable 5",
			vendor: "Claude",
			inputPerMTok: 10,
			cacheWritePerMTok: 12.5,
			cacheReadPerMTok: 1.0,
			outputPerMTok: 50,
			sourceUrl: ANTHROPIC_SOURCE,
			note: "キャッシュ書き込み/読み込み単価はSonnet/Opusと同じ比率(1.25倍/10%)で近似",
		},
	},
	{
		// "claude-sonnet-5-thinking-high" のようなIDにマッチ。"sonnet-4.5"等の旧世代は
		// "sonnet"の直後が"-4"になるため、このルールにはマッチしない。
		test: /claude[-_.]?sonnet[-_.]?5(?:[-_.]|$)/i,
		pricing: {
			displayName: "Claude Sonnet 5 (導入価格, 〜2026-08-31)",
			vendor: "Claude",
			inputPerMTok: 2,
			cacheWritePerMTok: 2.5,
			cacheReadPerMTok: 0.2,
			outputPerMTok: 10,
			sourceUrl: ANTHROPIC_SOURCE,
			note: "2026年8月31日までの導入価格。9月以降は$3/$15の通常価格に切り替わる予定",
		},
	},
	{
		// "claude-sonnet-5-thinking-high" のようなIDにマッチ。"sonnet-4.5"等の旧世代は
		// "sonnet"の直後が"-4"になるため、このルールにはマッチしない。
		test: /claude[-_.]?sonnet[-_.]?4(?:[-_.]|$)/i,
		pricing: {
			displayName: "Claude Sonnet 4.6",
			vendor: "Claude",
			inputPerMTok: 3,
			cacheWritePerMTok: 3.75,
			cacheReadPerMTok: 0.3,
			outputPerMTok: 15,
			sourceUrl: ANTHROPIC_SOURCE,
			note: "$6/MTok (output) は出典表に従い outputPerMTok=15 で近似"
		},
	},
	{
		test: /claude[-_.]?sonnet/i,
		pricing: {
			displayName: "Claude Sonnet (3.5〜4.6系)",
			vendor: "Claude",
			inputPerMTok: 3,
			cacheWritePerMTok: 3.75,
			cacheReadPerMTok: 0.3,
			outputPerMTok: 15,
			sourceUrl: ANTHROPIC_SOURCE,
		},
	},
	{
		test: /claude[-_.]?haiku/i,
		pricing: {
			displayName: "Claude Haiku (3.5〜4.5系)",
			vendor: "Claude",
			inputPerMTok: 1,
			cacheWritePerMTok: 1.25,
			cacheReadPerMTok: 0.1,
			outputPerMTok: 5,
			sourceUrl: ANTHROPIC_SOURCE,
			note: "Haiku 3.5は実際は$0.80/$4だが近似としてHaiku 4.5の価格を採用",
		},
	},

	// --- OpenAI GPT ---
	{
		test: /gpt-5\.6.*luna|luna.*gpt-5\.6/i,
		pricing: {
			displayName: "GPT-5.6 Luna",
			vendor: "GPT",
			inputPerMTok: 1,
			cacheWritePerMTok: 1.25,
			cacheReadPerMTok: 0.1,
			outputPerMTok: 6,
			sourceUrl: OPENAI_SOURCE,
		},
	},
	{
		test: /gpt-5\.6.*terra/i,
		pricing: {
			displayName: "GPT-5.6 Terra",
			vendor: "GPT",
			inputPerMTok: 2.5,
			cacheWritePerMTok: 3.125,
			cacheReadPerMTok: 0.25,
			outputPerMTok: 15,
			sourceUrl: OPENAI_SOURCE,
		},
	},
	{
		test: /gpt-5\.6|gpt-5\.5/i,
		pricing: {
			displayName: "GPT-5.6 Sol / GPT-5.5",
			vendor: "GPT",
			inputPerMTok: 5,
			cacheWritePerMTok: 6.25,
			cacheReadPerMTok: 0.5,
			outputPerMTok: 30,
			sourceUrl: OPENAI_SOURCE,
			note: "272K入力トークン以下の標準コンテキスト料金",
		},
	},
	{
		test: /gpt-5\.4.*mini/i,
		pricing: {
			displayName: "GPT-5.4 mini",
			vendor: "GPT",
			inputPerMTok: 0.75,
			cacheWritePerMTok: 0.9375,
			cacheReadPerMTok: 0.075,
			outputPerMTok: 4.5,
			sourceUrl: OPENAI_SOURCE,
		},
	},
	{
		test: /gpt-5\.4.*nano/i,
		pricing: {
			displayName: "GPT-5.4 nano",
			vendor: "GPT",
			inputPerMTok: 0.2,
			cacheWritePerMTok: 0.25,
			cacheReadPerMTok: 0.02,
			outputPerMTok: 1.25,
			sourceUrl: OPENAI_SOURCE,
		},
	},
	{
		test: /gpt-5\.4/i,
		pricing: {
			displayName: "GPT-5.4",
			vendor: "GPT",
			inputPerMTok: 2.5,
			cacheWritePerMTok: 3.125,
			cacheReadPerMTok: 0.25,
			outputPerMTok: 15,
			sourceUrl: OPENAI_SOURCE,
			note: "272K入力トークン以下の標準コンテキスト料金",
		},
	},
	{
		test: /gpt-5[-_.]?mini/i,
		pricing: {
			displayName: "GPT-5 mini",
			vendor: "GPT",
			inputPerMTok: 0.25,
			cacheWritePerMTok: 0.3125,
			cacheReadPerMTok: 0.025,
			outputPerMTok: 2,
			sourceUrl: OPENAI_SOURCE,
		},
	},
	{
		test: /gpt-5[-_.]?nano/i,
		pricing: {
			displayName: "GPT-5 nano",
			vendor: "GPT",
			inputPerMTok: 0.05,
			cacheWritePerMTok: 0.0625,
			cacheReadPerMTok: 0.005,
			outputPerMTok: 0.4,
			sourceUrl: OPENAI_SOURCE,
		},
	},
	{
		test: /gpt-5(?!\.\d)/i,
		pricing: {
			displayName: "GPT-5 (codex等の派生含む)",
			vendor: "GPT",
			inputPerMTok: 1.25,
			cacheWritePerMTok: 1.5625,
			cacheReadPerMTok: 0.125,
			outputPerMTok: 10,
			sourceUrl: OPENAI_SOURCE,
			note: "無印GPT-5世代の標準料金で近似(codex/派生モデル名を含む)",
		},
	},
	{
		test: /gpt-4\.1/i,
		pricing: {
			displayName: "GPT-4.1",
			vendor: "GPT",
			inputPerMTok: 2,
			cacheWritePerMTok: 2,
			cacheReadPerMTok: 0.5,
			outputPerMTok: 8,
			sourceUrl: OPENAI_SOURCE,
			note: "レガシーモデル",
		},
	},
	{
		test: /gpt-4o[-_.]?mini/i,
		pricing: {
			displayName: "GPT-4o mini",
			vendor: "GPT",
			inputPerMTok: 0.15,
			cacheWritePerMTok: 0.15,
			cacheReadPerMTok: 0.075,
			outputPerMTok: 0.6,
			sourceUrl: OPENAI_SOURCE,
			note: "レガシーモデル",
		},
	},
	{
		test: /gpt-4o/i,
		pricing: {
			displayName: "GPT-4o",
			vendor: "GPT",
			inputPerMTok: 2.5,
			cacheWritePerMTok: 2.5,
			cacheReadPerMTok: 1.25,
			outputPerMTok: 10,
			sourceUrl: OPENAI_SOURCE,
			note: "レガシーモデル",
		},
	},

	// --- Google Gemini ---
	{
		test: /gemini-3\.1.*flash-lite/i,
		pricing: {
			displayName: "Gemini 3.1 Flash-Lite",
			vendor: "Gemini",
			inputPerMTok: 0.25,
			cacheWritePerMTok: 0.25,
			cacheReadPerMTok: 0.025,
			outputPerMTok: 1.5,
			sourceUrl: GEMINI_SOURCE,
			note: "キャッシュ書き込みへの追加料金は無し(標準入力単価で近似)。ストレージ課金は含まない",
		},
	},
	{
		test: /gemini-3\.1.*pro/i,
		pricing: {
			displayName: "Gemini 3.1 Pro",
			vendor: "Gemini",
			inputPerMTok: 2,
			cacheWritePerMTok: 0.5,
			cacheReadPerMTok: 0.2,
			outputPerMTok: 12,
			sourceUrl: GEMINI_SOURCE,
			note: "200K入力トークン以下の料金。キャッシュストレージ課金(時間課金)は含まない",
		},
	},
	{
		test: /gemini-3\.5.*flash/i,
		pricing: {
			displayName: "Gemini 3.5 Flash",
			vendor: "Gemini",
			inputPerMTok: 1.5,
			cacheWritePerMTok: 1.5,
			cacheReadPerMTok: 0.15,
			outputPerMTok: 9,
			sourceUrl: GEMINI_SOURCE,
			note: "キャッシュ読込単価は公式値未公開のため90%割引で近似",
		},
	},
	{
		test: /gemini-3[-_.]?flash-lite/i,
		pricing: {
			displayName: "Gemini 3 Flash-Lite",
			vendor: "Gemini",
			inputPerMTok: 0.25,
			cacheWritePerMTok: 0.25,
			cacheReadPerMTok: 0.025,
			outputPerMTok: 1.5,
			sourceUrl: GEMINI_SOURCE,
		},
	},
	{
		test: /gemini-3[-_.]?flash/i,
		pricing: {
			displayName: "Gemini 3 Flash",
			vendor: "Gemini",
			inputPerMTok: 0.5,
			cacheWritePerMTok: 0.5,
			cacheReadPerMTok: 0.05,
			outputPerMTok: 3,
			sourceUrl: GEMINI_SOURCE,
		},
	},
	{
		test: /gemini-2\.5.*flash-lite/i,
		pricing: {
			displayName: "Gemini 2.5 Flash-Lite",
			vendor: "Gemini",
			inputPerMTok: 0.1,
			cacheWritePerMTok: 0.1,
			cacheReadPerMTok: 0.01,
			outputPerMTok: 0.4,
			sourceUrl: GEMINI_SOURCE,
			note: "レガシーモデル",
		},
	},
	{
		test: /gemini-2\.5.*flash/i,
		pricing: {
			displayName: "Gemini 2.5 Flash",
			vendor: "Gemini",
			inputPerMTok: 0.3,
			cacheWritePerMTok: 0.3,
			cacheReadPerMTok: 0.075,
			outputPerMTok: 2.5,
			sourceUrl: GEMINI_SOURCE,
			note: "レガシーモデル",
		},
	},
	{
		test: /gemini-2\.5.*pro/i,
		pricing: {
			displayName: "Gemini 2.5 Pro",
			vendor: "Gemini",
			inputPerMTok: 1.25,
			cacheWritePerMTok: 1.25,
			cacheReadPerMTok: 0.125,
			outputPerMTok: 10,
			sourceUrl: GEMINI_SOURCE,
			note: "レガシーモデル、200K入力トークン以下の料金",
		},
	},

	// --- xAI Grok ---
	{
		test: /grok[-_.]?4\.5/i,
		pricing: {
			displayName: "Grok 4.5",
			vendor: "Grok",
			inputPerMTok: 2,
			cacheWritePerMTok: 2,
			cacheReadPerMTok: 0.3,
			outputPerMTok: 6,
			sourceUrl: GROK_SOURCE,
			note: "200K入力トークン未満の料金。キャッシュ書き込みへの追加料金は無し",
		},
	},
	{
		test: /grok[-_.]?(?:build|code)/i,
		pricing: {
			displayName: "Grok Build 0.1 (grok-code)",
			vendor: "Grok",
			inputPerMTok: 1,
			cacheWritePerMTok: 1,
			cacheReadPerMTok: 0.2,
			outputPerMTok: 2,
			sourceUrl: GROK_SOURCE,
			note: "200K入力トークン未満の料金",
		},
	},
	{
		test: /grok[-_.]?4\.3|grok[-_.]?4\.20/i,
		pricing: {
			displayName: "Grok 4.3 / 4.20系",
			vendor: "Grok",
			inputPerMTok: 1.25,
			cacheWritePerMTok: 1.25,
			cacheReadPerMTok: 0.2,
			outputPerMTok: 2.5,
			sourceUrl: GROK_SOURCE,
			note: "200K入力トークン未満の料金",
		},
	},
	{
		test: /grok[-_.]?(?:4|3)(?!\.\d)/i,
		pricing: {
			displayName: "Grok 4 / 3 (廃止、4.3料金で課金)",
			vendor: "Grok",
			inputPerMTok: 1.25,
			cacheWritePerMTok: 1.25,
			cacheReadPerMTok: 0.2,
			outputPerMTok: 2.5,
			sourceUrl: GROK_SOURCE,
			note: "2026-05-15に廃止され、現在はGrok 4.3と同一料金で課金される",
		},
	},

	// --- DeepSeek ---
	{
		test: /deepseek.*v?4.*pro/i,
		pricing: {
			displayName: "DeepSeek V4 Pro",
			vendor: "DeepSeek",
			inputPerMTok: 0.435,
			cacheWritePerMTok: 0.435,
			cacheReadPerMTok: 0.003625,
			outputPerMTok: 0.87,
			sourceUrl: DEEPSEEK_SOURCE,
			note: "キャッシュ書き込みはcache miss(通常入力)と同額",
		},
	},
	{
		test: /deepseek.*v?4.*flash|deepseek[-_.]?chat|deepseek[-_.]?reasoner/i,
		pricing: {
			displayName: "DeepSeek V4 Flash",
			vendor: "DeepSeek",
			inputPerMTok: 0.14,
			cacheWritePerMTok: 0.14,
			cacheReadPerMTok: 0.0028,
			outputPerMTok: 0.28,
			sourceUrl: DEEPSEEK_SOURCE,
			note: "deepseek-chat/deepseek-reasonerはV4 Flashへの旧エイリアスとして近似",
		},
	},
];

export interface ModelCostBreakdown {
	inputCostUsd: number;
	cacheWriteCostUsd: number;
	cacheReadCostUsd: number;
	outputCostUsd: number;
	totalCostUsd: number;
}

export interface ResolvedModelPricing {
	pricing: ModelPricing;
	rule: RegExp;
}

/** モデルID文字列から料金表エントリを推測する。マッチしない場合はnull(=不明、概算対象外)を返す */
export function resolveModelPricing(modelId: string): ResolvedModelPricing | null {
	const normalized = modelId.trim();
	if (!normalized) return null;

	for (const rule of MODEL_PRICING_RULES) {
		if (rule.test.test(normalized)) {
			return { pricing: rule.pricing, rule: rule.test };
		}
	}
	return null;
}

export function calculateModelCostUsd(
	pricing: ModelPricing,
	tokens: {
		inputWithoutCacheWrite: number;
		inputWithCacheWrite: number;
		cacheRead: number;
		outputTokens: number;
	},
): ModelCostBreakdown {
	const inputCostUsd = (tokens.inputWithoutCacheWrite / 1_000_000) * pricing.inputPerMTok;
	const cacheWriteCostUsd = (tokens.inputWithCacheWrite / 1_000_000) * pricing.cacheWritePerMTok;
	const cacheReadCostUsd = (tokens.cacheRead / 1_000_000) * pricing.cacheReadPerMTok;
	const outputCostUsd = (tokens.outputTokens / 1_000_000) * pricing.outputPerMTok;
	return {
		inputCostUsd,
		cacheWriteCostUsd,
		cacheReadCostUsd,
		outputCostUsd,
		totalCostUsd: inputCostUsd + cacheWriteCostUsd + cacheReadCostUsd + outputCostUsd,
	};
}

/** 概算の前提として画面に表示する出典一覧(重複除去済み) */
export function listPricingSources(): { vendor: string; url: string }[] {
	const seen = new Map<string, string>();
	for (const rule of MODEL_PRICING_RULES) {
		if (!seen.has(rule.pricing.vendor)) {
			seen.set(rule.pricing.vendor, rule.pricing.sourceUrl);
		}
	}
	return Array.from(seen.entries()).map(([vendor, url]) => ({ vendor, url }));
}
