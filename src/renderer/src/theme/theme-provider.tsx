import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";

interface ThemeContextValue {
	theme: ThemePreference;
	resolvedTheme: "light" | "dark";
	setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme(): "light" | "dark" {
	if (typeof window === "undefined") return "light";
	return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * ダーク/ライト/システム追従の3モードテーマ管理。
 * 選択値はメインプロセス経由で config.yml に永続化する(Notion「テーマ・UIコンポーネント」対応)。
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const [theme, setThemeState] = useState<ThemePreference>("system");
	const [systemTheme, setSystemTheme] = useState<"light" | "dark">(getSystemTheme());
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		window.api.config.get().then((config) => {
			setThemeState(config.preferences.theme);
			setLoaded(true);
		});

		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const listener = (event: MediaQueryListEvent) => setSystemTheme(event.matches ? "dark" : "light");
		media.addEventListener("change", listener);
		return () => media.removeEventListener("change", listener);
	}, []);

	const resolvedTheme = theme === "system" ? systemTheme : theme;

	useEffect(() => {
		const root = document.documentElement;
		root.classList.toggle("dark", resolvedTheme === "dark");
	}, [resolvedTheme]);

	const setTheme = useCallback((next: ThemePreference) => {
		setThemeState(next);
		void window.api.config.setPreferences({ theme: next });
	}, []);

	const value = useMemo<ThemeContextValue>(
		() => ({ theme, resolvedTheme, setTheme }),
		[theme, resolvedTheme, setTheme],
	);

	if (!loaded) return null;

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
	const ctx = useContext(ThemeContext);
	if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
	return ctx;
}
