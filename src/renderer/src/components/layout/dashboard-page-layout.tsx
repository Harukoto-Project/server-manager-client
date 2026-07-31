import type { ReactNode } from "react";
import { cn } from "@renderer/lib/utils";

interface DashboardPageLayoutProps {
	title: string;
	description?: string;
	actions?: ReactNode;
	/** 任意の右側インスペクタ領域。指定時は2カラムレイアウトになる */
	inspector?: ReactNode;
	children: ReactNode;
	className?: string;
}

/**
 * 全ページ共通のダッシュボードレイアウトテンプレート。
 * 見出し・アクション領域・本文・任意の右側インスペクタの構造を統一する
 * (Notion「UI/UXアーキテクチャ」のDashboardPageLayoutに対応)。
 */
export function DashboardPageLayout({
	title,
	description,
	actions,
	inspector,
	children,
	className,
}: DashboardPageLayoutProps) {
	return (
		<div className="flex h-full flex-col gap-6 overflow-y-auto px-8 py-6">
			<header className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold tracking-tightest">{title}</h1>
					{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
				</div>
				{actions && <div className="flex items-center gap-2">{actions}</div>}
			</header>

			<div className={cn("flex flex-1 gap-6", inspector && "flex-col lg:flex-row")}>
				<div className={cn("flex-1", className)}>{children}</div>
				{inspector && <aside className="w-full shrink-0 lg:w-80">{inspector}</aside>}
			</div>
		</div>
	);
}
