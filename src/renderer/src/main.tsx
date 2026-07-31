import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./assets/globals.css";
import { TooltipProvider } from "@renderer/components/ui/tooltip";
import { ThemeProvider } from "@renderer/theme/theme-provider";
import { MotionPreferenceProvider } from "@renderer/theme/motion-preference-provider";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: { refetchOnWindowFocus: false, retry: 1 },
	},
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		{/* 既定はOSのprefers-reduced-motion設定にframer-motionの全アニメーションを追従させる
		    (apple-designスキル14章: springやparallaxを短いクロスフェードへ自動的に置き換える)。
		    「アプリの表示設定」ページで明示的にオン/オフした場合はMotionPreferenceProviderがそれを優先する。 */}
		<MotionPreferenceProvider>
			<QueryClientProvider client={queryClient}>
				<ThemeProvider>
					<TooltipProvider delayDuration={200}>
						<App />
					</TooltipProvider>
				</ThemeProvider>
			</QueryClientProvider>
		</MotionPreferenceProvider>
	</React.StrictMode>,
);
