import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@renderer/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@renderer/components/ui/dialog";

interface RecoveryCodeDialogProps {
	code: string;
	onClose: () => void;
}

export function RecoveryCodeDialog({ code, onClose }: RecoveryCodeDialogProps) {
	const [copied, setCopied] = useState(false);

	function handleCopy() {
		void navigator.clipboard.writeText(code).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		});
	}

	return (
		<Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>リカバリーコードを保存してください</DialogTitle>
				</DialogHeader>
				<div className="flex flex-col gap-4">
					<p className="text-sm text-muted-foreground">
						このコードはパスキーを紛失した場合に再登録するために使用します。
						安全な場所に保存してください。このダイアログを閉じると二度と表示されません。
					</p>
					<div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-3">
						<code className="flex-1 font-mono text-lg tracking-widest">{code}</code>
						<Button size="sm" variant="ghost" onClick={handleCopy}>
							{copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
						</Button>
					</div>
					<p className="text-xs text-destructive">
						※ このコードは一度しか使用できません。使用後は新しいコードが発行されません。
					</p>
				</div>
				<DialogFooter>
					<Button onClick={onClose}>保存しました。閉じる</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
