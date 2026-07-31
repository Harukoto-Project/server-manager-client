import { cn } from "@renderer/lib/utils";

interface UsageBarProps {
	label: string;
	usedPercent: number;
	hint?: string;
	className?: string;
}

/** ディスク等の使用率をラベル+パーセント+バーで表示する小さなカード */
export function UsageBar({ label, usedPercent, hint, className }: UsageBarProps) {
	const clamped = Math.min(100, Math.max(0, usedPercent));
	return (
		<div className={cn("rounded-lg border bg-card p-4", className)}>
			<div className="flex items-center justify-between gap-2 text-sm font-medium">
				<span className="truncate">{label}</span>
				<span className="shrink-0 text-muted-foreground">{usedPercent.toFixed(1)}%</span>
			</div>
			<div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
				<div
					className={cn("h-full rounded-full transition-all", clamped >= 90 ? "bg-destructive" : "bg-primary")}
					style={{ width: `${clamped}%` }}
				/>
			</div>
			{hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
		</div>
	);
}
