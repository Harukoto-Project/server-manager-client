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

interface ConfirmDestructiveDialogProps {
	trigger: React.ReactNode;
	title: string;
	description: string;
	confirmLabel?: string;
	onConfirm: () => void | Promise<void>;
}

/**
 * 破壊的操作(ノード削除・コンテナ削除・サーバー停止等)向けの確認ダイアログ。
 * トリガー要素を起点にスクリム+スケールインで表示する(Apple Design適用方針)。
 */
export function ConfirmDestructiveDialog({
	trigger,
	title,
	description,
	confirmLabel = "実行する",
	onConfirm,
}: ConfirmDestructiveDialogProps) {
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);

	async function handleConfirm() {
		setPending(true);
		try {
			await onConfirm();
			setOpen(false);
		} finally {
			setPending(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)}>
						キャンセル
					</Button>
					<Button variant="destructive" disabled={pending} onClick={handleConfirm}>
						{pending ? "実行中..." : confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
