import { MotionConfig } from "framer-motion";
import { useEffect } from "react";
import { useAppPreferencesStore } from "@renderer/state/app-preferences-store";

/**
 * 「アプリの表示設定」ページで変更した`reducedMotionOverride`をframer-motionの全アニメーションに反映する。
 * null(未設定)の場合はOSのprefers-reduced-motion設定に追従する("user")、
 * true/falseの場合はOS設定を無視して常に有効/無効にする("always"/"never")。
 */
export function MotionPreferenceProvider({ children }: { children: React.ReactNode }) {
	const { preferences, loaded, load } = useAppPreferencesStore();

	useEffect(() => {
		if (!loaded) void load();
	}, [loaded, load]);

	const override = preferences?.reducedMotionOverride ?? null;
	const reducedMotion = override === true ? "always" : override === false ? "never" : "user";

	return <MotionConfig reducedMotion={reducedMotion}>{children}</MotionConfig>;
}
