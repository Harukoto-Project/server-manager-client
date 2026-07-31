import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
		<QueryClientProvider client={queryClient}>
			<ThemeProvider>
				<TooltipProvider delayDuration={200}>
					<App />
				</TooltipProvider>
			</ThemeProvider>
		</QueryClientProvider>
	</React.StrictMode>,
);
