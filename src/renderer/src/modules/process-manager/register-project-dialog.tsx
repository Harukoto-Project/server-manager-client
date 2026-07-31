import { useState } from "react";
import { Button } from "@renderer/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@renderer/components/ui/dialog";
import { Switch } from "@renderer/components/ui/switch";
import type { ProcessManagerProjectKind, RegisterProcessManagerProjectInput } from "@renderer/lib/node-api-client";

const KIND_OPTIONS: Array<{ value: ProcessManagerProjectKind; label: string }> = [
	{ value: "node", label: "Node.js" },
	{ value: "python", label: "Python" },
	{ value: "custom", label: "カスタム" },
];

interface RegisterProjectDialogProps {
	trigger: React.ReactNode;
	onRegister: (input: RegisterProcessManagerProjectInput) => Promise<void>;
}

const inputClassName = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";

/** プロセス管理モジュールに新規プロジェクトを登録するダイアログ */
export function RegisterProjectDialog({ trigger, onRegister }: RegisterProjectDialogProps) {
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [name, setName] = useState("");
	const [kind, setKind] = useState<ProcessManagerProjectKind>("node");
	const [cwd, setCwd] = useState("");
	const [command, setCommand] = useState("");
	const [args, setArgs] = useState("");
	const [autoStart, setAutoStart] = useState(false);

	function resetForm() {
		setName("");
		setKind("node");
		setCwd("");
		setCommand("");
		setArgs("");
		setAutoStart(false);
		setError(null);
	}

	function handleOpenChange(next: boolean) {
		if (next) resetForm();
		setOpen(next);
	}

	async function handleSubmit() {
		if (!name.trim() || !cwd.trim() || !command.trim()) {
			setError("プロジェクト名・作業ディレクトリ・起動コマンドは必須です。");
			return;
		}
		setPending(true);
		setError(null);
		try {
			await onRegister({
				name: name.trim(),
				kind,
				cwd: cwd.trim(),
				command: command.trim(),
				args: args
					.split(" ")
					.map((a) => a.trim())
					.filter((a) => a.length > 0),
				autoStart,
			});
			setOpen(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : "プロジェクトの登録に失敗しました。");
		} finally {
			setPending(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>プロジェクトを追加</DialogTitle>
					<DialogDescription>
						Node.js/Pythonプロジェクトの起動設定を登録します。作業ディレクトリと起動コマンドはノード上の実パスを指定してください。
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="project-name">
							プロジェクト名
						</label>
						<input
							id="project-name"
							autoFocus
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="discord-bot"
							className={inputClassName}
						/>
					</div>

					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="project-kind">
							種別
						</label>
						<select
							id="project-kind"
							value={kind}
							onChange={(e) => setKind(e.target.value as ProcessManagerProjectKind)}
							className={inputClassName}
						>
							{KIND_OPTIONS.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</div>

					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="project-cwd">
							作業ディレクトリ
						</label>
						<input
							id="project-cwd"
							value={cwd}
							onChange={(e) => setCwd(e.target.value)}
							placeholder="/opt/projects/discord-bot"
							className={`${inputClassName} font-mono`}
						/>
					</div>

					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="project-command">
							起動コマンド
						</label>
						<input
							id="project-command"
							value={command}
							onChange={(e) => setCommand(e.target.value)}
							placeholder="node"
							className={`${inputClassName} font-mono`}
						/>
					</div>

					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground" htmlFor="project-args">
							引数(半角スペース区切り)
						</label>
						<input
							id="project-args"
							value={args}
							onChange={(e) => setArgs(e.target.value)}
							placeholder="index.js"
							className={`${inputClassName} font-mono`}
						/>
					</div>

					<div className="flex items-center justify-between rounded-lg border bg-card p-3">
						<div>
							<p className="text-sm font-medium">自動起動</p>
							<p className="text-xs text-muted-foreground">登録と同時にプロセスを起動します</p>
						</div>
						<Switch checked={autoStart} onCheckedChange={setAutoStart} />
					</div>

					{error && <p className="text-sm text-destructive">{error}</p>}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)}>
						キャンセル
					</Button>
					<Button disabled={pending} onClick={handleSubmit}>
						{pending ? "登録中..." : "登録する"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
