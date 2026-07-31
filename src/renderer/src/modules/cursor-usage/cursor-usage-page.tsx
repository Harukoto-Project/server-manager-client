import { AlertTriangle, FileSpreadsheet, Upload } from "lucide-react";
import { type ChangeEvent, useMemo, useRef, useState } from "react";
import { DashboardPageLayout } from "@renderer/components/layout/dashboard-page-layout";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { buildUsageReport, type UsageReport } from "./aggregate";
import { CsvParseError, type CursorUsageEventRow, parseCursorUsageCsv } from "./csv-parser";
import { formatExactTokenCount, formatJpy, formatPercent, formatTokenCount, formatUsd } from "./format";
import { listPricingSources, USD_TO_JPY_RATE } from "./model-pricing";
import { DailyTrendChart, ModelBarChart, type ModelBarDatum, TokenBreakdownDonut } from "./usage-charts";

const VENDOR_COLORS: Record<string, string> = {
	Claude: "hsl(24 90% 55%)",
	GPT: "hsl(160 84% 39%)",
	Gemini: "hsl(217 91% 60%)",
	Grok: "hsl(280 65% 60%)",
	DeepSeek: "hsl(340 75% 55%)",
};
const UNKNOWN_COLOR = "hsl(240 5% 60%)";

export function CursorUsagePage() {
	const [rows, setRows] = useState<CursorUsageEventRow[] | null>(null);
	const [fileName, setFileName] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	async function handleFile(file: File) {
		setLoading(true);
		setError(null);
		try {
			const text = await file.text();
			const parsed = parseCursorUsageCsv(text);
			if (parsed.length === 0) {
				setError("CSVにデータ行が見つかりませんでした。");
				setRows(null);
				return;
			}
			setRows(parsed);
			setFileName(file.name);
		} catch (err) {
			setError(
				err instanceof CsvParseError
					? err.message
					: "CSVの読み込みに失敗しました。Cursor Dashboardからエクスポートしたusage-events CSVか確認してください。",
			);
			setRows(null);
		} finally {
			setLoading(false);
		}
	}

	function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (file) void handleFile(file);
		e.target.value = "";
	}

	const report = useMemo<UsageReport | null>(() => (rows ? buildUsageReport(rows) : null), [rows]);

	const tokenBreakdown = useMemo(() => {
		if (!report) return null;
		// w/ Cache Write と w/o Cache Write は「キャッシュへの書き込みを伴うか」の違いに過ぎず、
		// いずれも当該リクエストでモデルへ新規に送信された入力トークンなので「入力」として合算する。
		const newInputTokens = report.totalInputWithoutCacheWrite + report.totalInputWithCacheWrite;
		const cacheReadTokens = report.totalCacheRead;
		const outputTokens = report.totalOutputTokens;
		const otherTokens = Math.max(0, report.totalTokens - newInputTokens - cacheReadTokens - outputTokens);
		return [
			{ key: "input", label: "入力(新規処理分)", value: newInputTokens, color: "hsl(var(--primary))" },
			{ key: "cache", label: "キャッシュ読込", value: cacheReadTokens, color: "hsl(160 84% 39%)" },
			{ key: "output", label: "出力", value: outputTokens, color: "hsl(38 92% 50%)" },
			{ key: "other", label: "その他(差分)", value: otherTokens, color: UNKNOWN_COLOR },
		];
	}, [report]);

	const modelBarData = useMemo<ModelBarDatum[]>(() => {
		if (!report) return [];
		return report.models.map((m) => ({
			model: m.model,
			shortLabel: m.model.length > 30 ? `${m.model.slice(0, 28)}…` : m.model,
			totalTokens: m.totalTokens,
			costJpy: m.costUsd * USD_TO_JPY_RATE,
			sharePercent: report.totalTokens > 0 ? (m.totalTokens / report.totalTokens) * 100 : 0,
			color: m.pricing ? VENDOR_COLORS[m.pricing.pricing.vendor] ?? UNKNOWN_COLOR : UNKNOWN_COLOR,
			unknown: !m.pricing,
		}));
	}, [report]);

	const dailyTrendData = useMemo(() => {
		if (!report) return [];
		return report.daily.map((d) => ({
			date: d.date,
			totalTokens: d.totalTokens,
			costJpy: d.costUsd * USD_TO_JPY_RATE,
		}));
	}, [report]);

	const totalCostJpy = report ? report.totalCostUsd * USD_TO_JPY_RATE : 0;
	const pricingSources = listPricingSources();
	const unknownModelCount = report ? report.models.filter((m) => !m.pricing).length : 0;

	return (
		<DashboardPageLayout
			title="Cursor使用量の推定"
			description="Cursor DashboardからエクスポートしたCSVを読み込み、モデル別の概算コストとトークン使用量を可視化します。ノードへの接続は不要です。"
			actions={
				<>
					<input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleInputChange} />
					<Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={loading}>
						<Upload className="h-4 w-4" /> {loading ? "読み込み中..." : rows ? "別のCSVを読み込む" : "CSVを選択"}
					</Button>
				</>
			}
		>
			{error && (
				<div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
					<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
					<span>{error}</span>
				</div>
			)}

			{!report && !error && (
				<Card>
					<CardContent className="flex flex-col items-center gap-3 py-16 text-center text-sm text-muted-foreground">
						<FileSpreadsheet className="h-10 w-10 text-muted-foreground/50" />
						<p>
							Cursor Dashboardの使用量ページからエクスポートした usage-events CSV を選択してください。
							<br />
							ファイルの内容はこのアプリ内(レンダラープロセス)でのみ処理され、外部への送信やメインプロセスへの転送は行いません。
						</p>
						<Button onClick={() => fileInputRef.current?.click()}>
							<Upload className="h-4 w-4" /> CSVを選択
						</Button>
					</CardContent>
				</Card>
			)}

			{report && tokenBreakdown && (
				<div className="space-y-4">
					{fileName && (
						<p className="text-xs text-muted-foreground">
							{fileName} を読み込みました({report.events.toLocaleString("ja-JP")}件
							{report.dateRange && ` / ${report.dateRange.from} 〜 ${report.dateRange.to}`})
						</p>
					)}

					{report.unknownModelEvents > 0 && (
						<div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
							<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
							<span>
								料金表に一致しないモデルが{unknownModelCount}種類・{report.unknownModelEvents.toLocaleString("ja-JP")}件
								(トークン数 {formatExactTokenCount(report.unknownModelTokens)})あります。これらは平均値等で埋め合わせず、
								概算コストの合計から除外しています。
							</span>
						</div>
					)}

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-medium text-muted-foreground">概算コスト合計</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-3xl font-semibold tracking-tight">{formatJpy(totalCostJpy)}</div>
								<p className="mt-1 text-xs text-muted-foreground">
									{formatUsd(report.totalCostUsd)} (1USD=¥{USD_TO_JPY_RATE} 固定換算)
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-medium text-muted-foreground">合計トークン数</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-3xl font-semibold tracking-tight">{formatTokenCount(report.totalTokens)}</div>
								<p className="mt-1 text-xs text-muted-foreground">{formatExactTokenCount(report.totalTokens)} トークン</p>
							</CardContent>
						</Card>
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-medium text-muted-foreground">イベント数</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-3xl font-semibold tracking-tight">{report.events.toLocaleString("ja-JP")}</div>
								<p className="mt-1 text-xs text-muted-foreground">CSVの行数(リクエスト数相当)</p>
							</CardContent>
						</Card>
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-medium text-muted-foreground">使用モデル数</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-3xl font-semibold tracking-tight">{report.models.length}</div>
								<p className="mt-1 text-xs text-muted-foreground">
									{unknownModelCount > 0 ? `うち不明: ${unknownModelCount}` : "すべて料金表に一致"}
								</p>
							</CardContent>
						</Card>
					</div>

					<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
						<Card>
							<CardHeader>
								<CardTitle className="text-base">合計トークンの内訳</CardTitle>
								<CardDescription>
									「入力(新規処理分)」はInput (w/ Cache Write)とInput (w/o Cache Write)の合計です。
									両者はキャッシュ書き込みの有無の違いに過ぎず、いずれもリクエストごとにモデルへ新規送信された入力トークンのため合算しています。
									「キャッシュ読込」はCache Read、「出力」はOutput Tokens、「その他」はTotal Tokensとの差分(丸め誤差等)です。
								</CardDescription>
							</CardHeader>
							<CardContent>
								<TokenBreakdownDonut slices={tokenBreakdown} totalTokens={report.totalTokens} />
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="text-base">モデル別トークン使用量</CardTitle>
								<CardDescription>
									トークン数の多い順。バーの色はベンダー(Claude/GPT/Gemini/Grok/DeepSeek)を表し、グレーは料金表未対応のモデルです。
								</CardDescription>
							</CardHeader>
							<CardContent>
								<ModelBarChart data={modelBarData} />
							</CardContent>
						</Card>
					</div>

					<Card>
						<CardHeader>
							<CardTitle className="text-base">日別の推移</CardTitle>
							<CardDescription>CSVのDate列(UTC)の日付部分でトークン数を集計しています。</CardDescription>
						</CardHeader>
						<CardContent>
							<DailyTrendChart data={dailyTrendData} />
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-base">モデル別詳細</CardTitle>
							<CardDescription>概算コストは公開料金表に基づく推測結果であり、実際の課金額と異なる場合があります。</CardDescription>
						</CardHeader>
						<CardContent className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b text-left text-xs text-muted-foreground">
										<th className="py-2 pr-4 font-medium">モデル(CSV記載値)</th>
										<th className="py-2 pr-4 font-medium">推測結果</th>
										<th className="py-2 pr-4 text-right font-medium">件数</th>
										<th className="py-2 pr-4 text-right font-medium">トークン数</th>
										<th className="py-2 pr-4 text-right font-medium">シェア</th>
										<th className="py-2 text-right font-medium">概算コスト</th>
									</tr>
								</thead>
								<tbody>
									{report.models.map((m) => (
										<tr key={m.model} className="border-b border-border/60 last:border-0">
											<td className="py-2 pr-4 font-mono text-xs">{m.model}</td>
											<td className="py-2 pr-4">
												{m.pricing ? (
													<span className="text-xs">{m.pricing.pricing.displayName}</span>
												) : (
													<span className="text-xs text-amber-600 dark:text-amber-400">不明(概算対象外)</span>
												)}
											</td>
											<td className="py-2 pr-4 text-right">{m.events.toLocaleString("ja-JP")}</td>
											<td className="py-2 pr-4 text-right">{formatExactTokenCount(m.totalTokens)}</td>
											<td className="py-2 pr-4 text-right">
												{formatPercent(report.totalTokens > 0 ? (m.totalTokens / report.totalTokens) * 100 : 0)}
											</td>
											<td className="py-2 text-right">{m.pricing ? formatJpy(m.costUsd * USD_TO_JPY_RATE) : "—"}</td>
										</tr>
									))}
								</tbody>
							</table>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-sm">料金表の出典・注意事項</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2 text-xs text-muted-foreground">
							<p>
								本ページの概算コストは、CSVのCost列(Cursor側の課金額。User API Key利用時は0.00固定で記録される)を使わず、
								Model列の文字列から各社の公開APIモデルを推測し、そのモデルの公開料金表(1Mトークンあたりの入力/出力/キャッシュ読込/キャッシュ書込単価、USD)を
								独自に適用して算出した参考値です。実際の課金額とは一致しません。未知のモデル名は平均値等で補完せず「不明」として除外しています。
							</p>
							<ul className="list-inside list-disc space-y-1">
								{pricingSources.map((s) => (
									<li key={s.vendor}>
										{s.vendor}:{" "}
										<a href={s.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
											{s.url}
										</a>
									</li>
								))}
							</ul>
						</CardContent>
					</Card>
				</div>
			)}
		</DashboardPageLayout>
	);
}
