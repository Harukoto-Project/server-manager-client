import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@renderer/lib/utils";

interface DashboardPageLayoutProps {
	title: string;
	description?: ReactNode;
	actions?: ReactNode;
	/** 任意の右側インスペクタ領域。指定時は2カラムレイアウトになる */
	inspector?: ReactNode;
	children: ReactNode;
	className?: string;
	/** 指定すると見出しの上に「一覧に戻る」リンクを表示する(詳細ページ用) */
	backTo?: string;
	backLabel?: string;
	/**
	 * trueの場合、inspectorが無くてもchildrenをinspector同様のflex-full構造にし、
	 * ページ全体をスクロールさせず本文側に高さいっぱいを割り当てる(ターミナル等の固定高さページ向け)
	 */
	fillHeight?: boolean;
}

/**
 * 全ページ共通のダッシュボードレイアウトテンプレート。
 * 見出し・アクション領域・本文・任意の右側インスペクタの構造を統一する
 * (Notion「UI/UXアーキテクチャ」のDashboardPageLayoutに対応)。
 *
 * ヘッダーは`glass-toolbar`(半透明マテリアル)でsticky表示し、本文はその下をスクロールする。
 * 硬い罫線の代わりにブラー+シャドウで境界を示す(apple-designスキル12章「scroll edge effects」)。
 */
export function DashboardPageLayout({
	title,
	description,
	actions,
	inspector,
	children,
	className,
	backTo,
	backLabel = "一覧に戻る",
	fillHeight = false,
}: DashboardPageLayoutProps) {
	const useFlexFull = Boolean(inspector) || fillHeight;

	return (
		<div className="flex h-full flex-col overflow-hidden">
			<header className="glass-toolbar sticky top-0 z-10 flex flex-wrap items-start justify-between gap-4 px-8 py-5 shadow-[0_1px_0_0_hsl(var(--border)/0.5)]">
				<div>
					{backTo && (
						<Link
							to={backTo}
							className="mb-1.5 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
						>
							<ArrowLeft className="h-3.5 w-3.5" /> {backLabel}
						</Link>
					)}
					<h1 className="text-2xl font-semibold tracking-tightest">{title}</h1>
					{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
				</div>
				{actions && <div className="flex items-center gap-2">{actions}</div>}
			</header>

			<div
				className={cn(
					"min-h-0 flex-1 px-8 py-6",
					useFlexFull ? "overflow-y-auto lg:overflow-hidden" : "overflow-y-auto",
				)}
			>
				<div className={cn("flex gap-6", useFlexFull && "h-full flex-col lg:flex-row")}>
					<div
						className={cn("min-h-0 flex-1", useFlexFull && "flex flex-col lg:h-full lg:overflow-y-auto", className)}
					>
						{children}
					</div>
					{inspector && (
						<aside className="w-full shrink-0 space-y-4 lg:h-full lg:w-80 lg:overflow-y-auto">{inspector}</aside>
					)}
				</div>
			</div>
		</div>
	);
}
