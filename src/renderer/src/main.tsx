import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./assets/globals.css";
import { TooltipProvider } from "@renderer/components/ui/tooltip";
import { ThemeProvider } from "@renderer/theme/theme-provider";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: { refetchOnWindowFocus: false, retry: 1 },
	},
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		{/* reducedMotion="user" でOSのprefers-reduced-motion設定をframer-motionの全アニメーションに反映する
		    (apple-designスキル14章: springやparallaxを短いクロスフェードへ自動的に置き換える) */}
		<MotionConfig reducedMotion="user">
			<QueryClientProvider client={queryClient}>
				<ThemeProvider>
					<TooltipProvider delayDuration={200}>
						<App />
					</TooltipProvider>
				</ThemeProvider>
			</QueryClientProvider>
		</MotionConfig>
	</React.StrictMode>,
);
