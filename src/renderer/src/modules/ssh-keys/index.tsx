import { KeyRound } from "lucide-react";
import type { ModuleDefinition } from "@renderer/modules/types";
import { SshKeysPage } from "@renderer/modules/system-settings/pages/ssh-keys-page";

export const sshKeysModule: ModuleDefinition = {
	id: "ssh-keys",
	label: "SSH公開鍵",
	icon: KeyRound,
	group: "system",
	order: 35,
	element: SshKeysPage,
};
