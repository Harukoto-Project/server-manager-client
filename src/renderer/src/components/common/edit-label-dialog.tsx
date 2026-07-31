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

interface EditLabelDialogProps {
	trigger: React.ReactNode;
	title: string;
	description?: string;
	initialValue: string;
	placeholder?: string;
	onSave: (value: string) => void | Promise<void>;
}

/** 表示名(ラベル)編集用の汎用ダイアログ。空欄で保存すると元の名称に戻る */
export function EditLabelDialog({ trigger, title, description, initialValue, placeholder, onSave }: EditLabelDialogProps) {
	const [open, setOpen] = useState(false);
	const [value, setValue] = useState(initialValue);
	const [pending, setPending] = useState(false);

	function handleOpenChange(next: boolean) {
		if (next) setValue(initialValue);
		setOpen(next);
	}

	async function handleSave() {
		setPending(true);
		try {
			await onSave(value);
			setOpen(false);
		} finally {
			setPending(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{description && <DialogDescription>{description}</DialogDescription>}
				</DialogHeader>
				<input
					autoFocus
					value={value}
					onChange={(e) => setValue(e.target.value)}
					placeholder={placeholder}
					className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							handleSave();
						}
					}}
				/>
				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)}>
						キャンセル
					</Button>
					<Button disabled={pending} onClick={handleSave}>
						{pending ? "保存中..." : "保存"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
