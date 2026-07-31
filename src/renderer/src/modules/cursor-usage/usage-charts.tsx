import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Legend,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { formatExactTokenCount, formatJpy, formatPercent, formatTokenCount } from "./format";

export interface TokenBreakdownSlice {
	key: string;
	label: string;
	value: number;
	color: string;
}

interface TokenBreakdownDonutProps {
	slices: TokenBreakdownSlice[];
	totalTokens: number;
}

/** 「入力(新規)/キャッシュ読込/出力/その他」のトークン内訳ドーナツグラフ */
export function TokenBreakdownDonut({ slices, totalTokens }: TokenBreakdownDonutProps) {
	const visible = slices.filter((s) => s.value > 0);
	if (visible.length === 0 || totalTokens <= 0) {
		return (
			<div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
				表示できるデータがありません。
			</div>
		);
	}

	return (
		<div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-6">
			<ResponsiveContainer width="100%" height={220} className="max-w-xs">
				<PieChart>
					<Pie
						data={visible}
						dataKey="value"
						nameKey="label"
						innerRadius="60%"
						outerRadius="90%"
						paddingAngle={2}
						strokeWidth={0}
					>
						{visible.map((slice) => (
							<Cell key={slice.key} fill={slice.color} />
						))}
					</Pie>
					<Tooltip
						formatter={(value, name) => {
							const numeric = Number(value ?? 0);
							return [`${formatExactTokenCount(numeric)} (${formatPercent((numeric / totalTokens) * 100)})`, String(name)];
						}}
						contentStyle={{
							backgroundColor: "hsl(var(--popover))",
							border: "1px solid hsl(var(--border))",
							borderRadius: 8,
							fontSize: 12,
						}}
					/>
				</PieChart>
			</ResponsiveContainer>
			<div className="flex flex-1 flex-col gap-2">
				{visible.map((slice) => (
					<div key={slice.key} className="flex items-center justify-between gap-3 text-sm">
						<div className="flex items-center gap-2">
							<span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
							<span>{slice.label}</span>
						</div>
						<div className="text-right">
							<div className="font-medium">{formatTokenCount(slice.value)}</div>
							<div className="text-xs text-muted-foreground">{formatPercent((slice.value / totalTokens) * 100)}</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

export interface ModelBarDatum {
	model: string;
	shortLabel: string;
	totalTokens: number;
	costJpy: number;
	sharePercent: number;
	color: string;
	unknown: boolean;
}

interface ModelBarChartProps {
	data: ModelBarDatum[];
}

/** モデル別のトークン使用量を降順の横向き棒グラフで表示する */
export function ModelBarChart({ data }: ModelBarChartProps) {
	if (data.length === 0) {
		return (
			<div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
				表示できるデータがありません。
			</div>
		);
	}

	const height = Math.max(160, data.length * 44);

	return (
		<ResponsiveContainer width="100%" height={height}>
			<BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }}>
				<CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
				<XAxis
					type="number"
					tickFormatter={(v) => formatTokenCount(v)}
					tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
					axisLine={{ stroke: "hsl(var(--border))" }}
					tickLine={false}
				/>
				<YAxis
					type="category"
					dataKey="shortLabel"
					width={180}
					tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
					axisLine={false}
					tickLine={false}
				/>
				<Tooltip
					formatter={(value, _name, item) => {
						const numeric = Number(value ?? 0);
						const datum = (item as { payload?: ModelBarDatum })?.payload;
						if (!datum) return [formatExactTokenCount(numeric), "トークン数"];
						const costLabel = datum.unknown ? "不明(概算対象外)" : formatJpy(datum.costJpy);
						return [
							`${formatExactTokenCount(numeric)} / 概算 ${costLabel} / 全体の${formatPercent(datum.sharePercent)}`,
							"トークン数",
						];
					}}
					labelFormatter={(label) => String(label)}
					contentStyle={{
						backgroundColor: "hsl(var(--popover))",
						border: "1px solid hsl(var(--border))",
						borderRadius: 8,
						fontSize: 12,
					}}
				/>
				<Bar dataKey="totalTokens" radius={[0, 4, 4, 0]}>
					{data.map((d) => (
						<Cell key={d.model} fill={d.color} />
					))}
				</Bar>
			</BarChart>
		</ResponsiveContainer>
	);
}

export interface DailyTrendDatum {
	date: string;
	totalTokens: number;
	costJpy: number;
}

interface DailyTrendChartProps {
	data: DailyTrendDatum[];
}

/** 日別のトークン数/概算コストの推移を表示する複合バー+ライン風のグラフ */
export function DailyTrendChart({ data }: DailyTrendChartProps) {
	if (data.length < 2) {
		return (
			<div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
				日別の推移を表示するには2日以上のデータが必要です。
			</div>
		);
	}

	return (
		<ResponsiveContainer width="100%" height={260}>
			<BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
				<CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
				<XAxis
					dataKey="date"
					tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
					axisLine={{ stroke: "hsl(var(--border))" }}
					tickLine={false}
					minTickGap={24}
				/>
				<YAxis
					yAxisId="tokens"
					tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
					axisLine={false}
					tickLine={false}
					width={48}
					tickFormatter={(v) => formatTokenCount(v)}
				/>
				<Tooltip
					formatter={(value, name) => {
						const numeric = Number(value ?? 0);
						const label = String(name);
						return label === "概算コスト" ? [formatJpy(numeric), label] : [formatExactTokenCount(numeric), label];
					}}
					contentStyle={{
						backgroundColor: "hsl(var(--popover))",
						border: "1px solid hsl(var(--border))",
						borderRadius: 8,
						fontSize: 12,
					}}
				/>
				<Legend wrapperStyle={{ fontSize: 12 }} />
				<Bar yAxisId="tokens" dataKey="totalTokens" name="トークン数" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
			</BarChart>
		</ResponsiveContainer>
	);
}
