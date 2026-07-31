import { LogIn } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@renderer/components/ui/card";

interface TerminalLoginFormProps {
	disabled?: boolean;
	pending?: boolean;
	errorMessage?: string;
	onSubmit: (username: string, password: string) => void;
}

const inputClassName = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";

/**
 * Webターミナル利用前に表示するログイン画面。
 * ノード上のLinuxユーザー名/パスワードでログインし、認証自体はノードのsshd(PAM)に委ねる。
 * パスワードはこの画面からWebSocket経由でノードに送信されるのみで、アプリ側には保存しない。
 */
export function TerminalLoginForm({ disabled, pending, errorMessage, onSubmit }: TerminalLoginFormProps) {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");

	function handleSubmit(event: FormEvent) {
		event.preventDefault();
		if (!username.trim() || !password) return;
		onSubmit(username.trim(), password);
	}

	return (
		<div className="flex flex-1 items-center justify-center">
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle>ノードにログイン</CardTitle>
					<CardDescription>ノード上のLinuxユーザー名とパスワードでログイン</CardDescription>
				</CardHeader>
				<CardContent>
					<form className="space-y-3" onSubmit={handleSubmit}>
						<div className="space-y-1">
							<label className="text-xs font-medium text-muted-foreground" htmlFor="terminal-username">
								ユーザー名
							</label>
							<input
								id="terminal-username"
								autoFocus
								autoComplete="username"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								className={inputClassName}
								disabled={disabled || pending}
							/>
						</div>
						<div className="space-y-1">
							<label className="text-xs font-medium text-muted-foreground" htmlFor="terminal-password">
								パスワード
							</label>
							<input
								id="terminal-password"
								type="password"
								autoComplete="current-password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className={inputClassName}
								disabled={disabled || pending}
							/>
						</div>

						{errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

						<Button type="submit" className="w-full" disabled={disabled || pending}>
							<LogIn className="h-4 w-4" /> {pending ? "ログイン中..." : "ログイン"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
