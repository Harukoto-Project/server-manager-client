import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@renderer/components/ui/card";
import { cn } from "@renderer/lib/utils";

interface EntityListProps {
	children: ReactNode;
	className?: string;
}

/** Pterodactylのサーバー一覧のような、行区切りのリスト表示コンテナ */
export function EntityList({ children, className }: EntityListProps) {
	return (
		<Card className={cn("overflow-hidden p-0", className)}>
			<div className="divide-y divide-border">{children}</div>
		</Card>
	);
}

interface EntityListItemProps {
	icon: LucideIcon;
	title: ReactNode;
	subtitle?: ReactNode;
	meta?: ReactNode;
	badge?: ReactNode;
	onClick?: () => void;
}

/** リストの1行。onClickを渡すとクリック/Enterで詳細ページ等に遷移できるようになる */
export function EntityListItem({ icon: Icon, title, subtitle, meta, badge, onClick }: EntityListItemProps) {
	return (
		<div
			role={onClick ? "button" : undefined}
			tabIndex={onClick ? 0 : undefined}
			onClick={onClick}
			onKeyDown={
				onClick
					? (event) => {
							if (event.key === "Enter" || event.key === " ") {
								event.preventDefault();
								onClick();
							}
						}
					: undefined
			}
			className={cn(
				"flex items-center gap-3 px-4 py-3 text-left transition-colors",
				onClick && "cursor-pointer hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none",
			)}
		>
			<Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium">{title}</p>
				{subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
			</div>
			{meta && <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{meta}</span>}
			{badge}
			{onClick && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />}
		</div>
	);
}
