import { Check, Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@renderer/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@renderer/components/ui/dropdown-menu";
import { type ThemePreference, useTheme } from "@renderer/theme/theme-provider";

const options: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
	{ value: "light", label: "ライト", icon: Sun },
	{ value: "dark", label: "ダーク", icon: Moon },
	{ value: "system", label: "システムに合わせる", icon: Monitor },
];

export function ThemeToggle() {
	const { theme, setTheme, resolvedTheme } = useTheme();
	const ActiveIcon = resolvedTheme === "dark" ? Moon : Sun;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="icon" title="テーマ切替">
					<ActiveIcon className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{options.map((option) => (
					<DropdownMenuItem key={option.value} onClick={() => setTheme(option.value)}>
						<option.icon className="mr-2 h-4 w-4" />
						{option.label}
						{theme === option.value && <Check className="ml-auto h-4 w-4" />}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
