export function formatJpy(amount: number): string {
	return `¥${Math.round(amount).toLocaleString("ja-JP")}`;
}

export function formatTokenCount(count: number): string {
	if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(2)}M`;
	if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
	return count.toLocaleString("ja-JP");
}

export function formatExactTokenCount(count: number): string {
	return Math.round(count).toLocaleString("ja-JP");
}

export function formatPercent(value: number): string {
	return `${value.toFixed(1)}%`;
}

export function formatUsd(amount: number): string {
	return `$${amount.toFixed(2)}`;
}
