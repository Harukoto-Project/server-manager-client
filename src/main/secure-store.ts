import { safeStorage } from "electron";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * ノードごとのセッショントークンを保存するセキュアストレージ。
 * ElectronのsafeStorage(Windowsでは DPAPI、macOSでは Keychain、Linuxでは libsecret)で
 * 暗号化してから `config.yml` とは別のフォルダに保存する(機微情報をYAMLに含めない設計)。
 */
export class SecureTokenStore {
	private readonly dir: string;

	constructor(rootDir: string) {
		this.dir = path.join(rootDir, "secure");
		mkdirSync(this.dir, { recursive: true });
	}

	private fileFor(nodeId: string): string {
		return path.join(this.dir, `${nodeId}.bin`);
	}

	set(nodeId: string, token: string): void {
		if (!safeStorage.isEncryptionAvailable()) {
			throw new Error("この環境ではOSのセキュアストレージが利用できません");
		}
		writeFileSync(this.fileFor(nodeId), safeStorage.encryptString(token));
	}

	get(nodeId: string): string | null {
		try {
			const encrypted = readFileSync(this.fileFor(nodeId));
			return safeStorage.decryptString(encrypted);
		} catch {
			return null;
		}
	}

	delete(nodeId: string): void {
		rmSync(this.fileFor(nodeId), { force: true });
	}
}
