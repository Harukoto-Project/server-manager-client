import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface ChartSeries {
	key: string;
	label: string;
	color: string;
}

interface TimeSeriesChartProps {
	data: Array<Record<string, number | string>>;
	series: ChartSeries[];
	height?: number;
	yDomain?: [number | "auto", number | "auto"];
	valueFormatter?: (value: number) => string;
}

function formatTime(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/**
 * server-manager-apiにはモニタリングの履歴APIがないため、クライアント側で蓄積した
 * 直近のポーリング結果(useMonitoringHistory参照)を折れ線+グラデーション塗りで表示する簡易チャート。
 */
export function TimeSeriesChart({
	data,
	series,
	height = 240,
	yDomain = [0, "auto"],
	valueFormatter,
}: TimeSeriesChartProps) {
	if (data.length < 2) {
		return (
			<div
				className="flex items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground"
				style={{ height }}
			>
				データを収集中です。しばらくこのページを開いたままお待ちください。
			</div>
		);
	}

	return (
		<ResponsiveContainer width="100%" height={height}>
			<AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
				<defs>
					{series.map((s) => (
						<linearGradient key={s.key} id={`chart-gradient-${s.key}`} x1="0" y1="0" x2="0" y2="1">
							<stop offset="5%" stopColor={s.color} stopOpacity={0.35} />
							<stop offset="95%" stopColor={s.color} stopOpacity={0} />
						</linearGradient>
					))}
				</defs>
				<CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
				<XAxis
					dataKey="timestamp"
					tickFormatter={formatTime}
					tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
					axisLine={{ stroke: "hsl(var(--border))" }}
					tickLine={false}
					minTickGap={40}
				/>
				<YAxis
					domain={yDomain}
					tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
					axisLine={false}
					tickLine={false}
					width={48}
					tickFormatter={valueFormatter}
				/>
				<Tooltip
					labelFormatter={(value) => formatTime(value as string)}
					formatter={(value, name) => [
						typeof value === "number" && valueFormatter ? valueFormatter(value) : String(value),
						String(name),
					]}
					contentStyle={{
						backgroundColor: "hsl(var(--popover))",
						border: "1px solid hsl(var(--border))",
						borderRadius: 8,
						fontSize: 12,
					}}
				/>
				{series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
				{series.map((s) => (
					<Area
						key={s.key}
						type="monotone"
						dataKey={s.key}
						name={s.label}
						stroke={s.color}
						fill={`url(#chart-gradient-${s.key})`}
						strokeWidth={2}
						isAnimationActive={false}
						dot={false}
					/>
				))}
			</AreaChart>
		</ResponsiveContainer>
	);
}
