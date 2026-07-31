import type { ReactNode } from "react";
import { cn } from "@renderer/lib/utils";

interface DetailFieldProps {
	label: string;
	value: ReactNode;
	className?: string;
}

/** 詳細ページで使う「ラベル + 値」表示用の小さなカード */
export function DetailField({ label, value, className }: DetailFieldProps) {
	return (
		<div className={cn("rounded-lg border bg-card p-4", className)}>
			<p className="text-xs font-medium text-muted-foreground">{label}</p>
			<div className="mt-1 text-sm">{value}</div>
		</div>
	);
}
