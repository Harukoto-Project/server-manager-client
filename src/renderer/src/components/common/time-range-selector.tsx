import { Tabs, TabsList, TabsTrigger } from "@renderer/components/ui/tabs";

export interface TimeRangeOption {
	label: string;
	minutes: number;
}

export const DEFAULT_TIME_RANGE_OPTIONS: TimeRangeOption[] = [
	{ label: "1時間", minutes: 60 },
	{ label: "6時間", minutes: 360 },
	{ label: "24時間", minutes: 1440 },
	{ label: "7日間", minutes: 10080 },
];

interface TimeRangeSelectorProps {
	value: number;
	onChange: (minutes: number) => void;
	options?: TimeRangeOption[];
}

/** APIが記録した過去のモニタリング履歴の表示期間を切り替えるタブ */
export function TimeRangeSelector({ value, onChange, options = DEFAULT_TIME_RANGE_OPTIONS }: TimeRangeSelectorProps) {
	return (
		<Tabs value={String(value)} onValueChange={(next) => onChange(Number(next))}>
			<TabsList>
				{options.map((option) => (
					<TabsTrigger key={option.minutes} value={String(option.minutes)}>
						{option.label}
					</TabsTrigger>
				))}
			</TabsList>
		</Tabs>
	);
}
