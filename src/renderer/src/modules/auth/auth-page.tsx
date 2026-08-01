import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { AlertCircle, Fingerprint, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@renderer/components/ui/button";
import {
	NodeApiError,
	fetchAuthStatus,
	fetchLoginOptions,
	fetchRecoverOptions,
	fetchRegisterOptions,
	verifyLogin,
	verifyRegistration,
} from "@renderer/lib/node-api-client";
import { useNodesStore } from "@renderer/state/nodes-store";
import { useAuthStore } from "@renderer/state/auth-store";
import { RecoveryCodeDialog } from "./recovery-code-dialog";

type AuthMode = "login" | "setup" | "recover";

export function NodeAuthPage() {
	const { nodeId } = useParams<{ nodeId: string }>();
	const navigate = useNavigate();
	const nodes = useNodesStore((s) => s.nodes);
	const { setSession } = useAuthStore();

	const node = nodes.find((n) => n.id === nodeId);

	const [mode, setMode] = useState<AuthMode>("login");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
	const [recoveryInput, setRecoveryInput] = useState("");

	useEffect(() => {
		if (!node) return;
		fetchAuthStatus(node).then((status) => {
			if (status.passkeyCount === 0) setMode("setup");
		}).catch(() => {});
	}, [node]);

	if (!node) {
		return (
			<div className="flex h-full items-center justify-center text-muted-foreground">
				ノードが見つかりません
			</div>
		);
	}

	async function handleLogin() {
		setLoading(true);
		setError(null);
		try {
			const options = await fetchLoginOptions(node!);
			const authResponse = await startAuthentication({ optionsJSON: options as never });
			const result = await verifyLogin(node!, authResponse);
			setSession(node!.id, result.token, result.expiresInMinutes);
			navigate(`/nodes/${node!.id}/overview`, { replace: true });
		} catch (err) {
			if (err instanceof Error && err.name === "NotAllowedError") {
				setError("パスキー認証がキャンセルされました。");
			} else {
				setError(err instanceof NodeApiError ? err.message : "認証中にエラーが発生しました。");
			}
		} finally {
			setLoading(false);
		}
	}

	async function handleSetup() {
		setLoading(true);
		setError(null);
		try {
			const options = await fetchRegisterOptions(node!);
			const regResponse = await startRegistration({ optionsJSON: options as never });
			const result = await verifyRegistration(node!, regResponse);
			if (!result.verified) throw new Error("登録の検証に失敗しました");
			if (result.recoveryCode) setRecoveryCode(result.recoveryCode);

			const loginOptions = await fetchLoginOptions(node!);
			const authResponse = await startAuthentication({ optionsJSON: loginOptions as never });
			const loginResult = await verifyLogin(node!, authResponse);
			setSession(node!.id, loginResult.token, loginResult.expiresInMinutes);

			if (!result.recoveryCode) {
				navigate(`/nodes/${node!.id}/overview`, { replace: true });
			}
		} catch (err) {
			if (err instanceof Error && err.name === "NotAllowedError") {
				setError("パスキー操作がキャンセルされました。");
			} else {
				setError(err instanceof NodeApiError ? err.message : "セットアップ中にエラーが発生しました。");
			}
		} finally {
			setLoading(false);
		}
	}

	async function handleRecover() {
		if (!recoveryInput.trim()) return;
		setLoading(true);
		setError(null);
		try {
			const options = await fetchRecoverOptions(node!, recoveryInput.trim());
			const regResponse = await startRegistration({ optionsJSON: options as never });
			const result = await verifyRegistration(node!, regResponse);
			if (!result.verified) throw new Error("登録の検証に失敗しました");

			const loginOptions = await fetchLoginOptions(node!);
			const authResponse = await startAuthentication({ optionsJSON: loginOptions as never });
			const loginResult = await verifyLogin(node!, authResponse);
			setSession(node!.id, loginResult.token, loginResult.expiresInMinutes);
			navigate(`/nodes/${node!.id}/overview`, { replace: true });
		} catch (err) {
			if (err instanceof Error && err.name === "NotAllowedError") {
				setError("パスキー操作がキャンセルされました。");
			} else {
				setError(err instanceof NodeApiError ? err.message : "リカバリー中にエラーが発生しました。");
			}
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="flex h-full flex-col items-center justify-center gap-8 bg-background px-4">
			<div className="flex flex-col items-center gap-2 text-center">
				<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
					{mode === "setup" ? <ShieldCheck className="h-7 w-7" /> : <Fingerprint className="h-7 w-7" />}
				</div>
				<h1 className="text-xl font-semibold">
					{mode === "setup" && "パスキーを登録"}
					{mode === "login" && "パスキーで認証"}
					{mode === "recover" && "リカバリーコードで復元"}
				</h1>
				<p className="text-sm text-muted-foreground">
					{node.name} ({node.host}:{node.port})
				</p>
			</div>

			<div className="flex w-full max-w-sm flex-col gap-3">
				{mode === "login" && (
					<>
						<Button size="lg" className="w-full gap-2" onClick={handleLogin} disabled={loading}>
							{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Fingerprint className="h-5 w-5" />}
							{loading ? "認証中..." : "パスキーで認証"}
						</Button>
						<Button
							variant="ghost"
							size="sm"
							className="w-full gap-2 text-muted-foreground"
							onClick={() => { setMode("recover"); setError(null); }}
							disabled={loading}
						>
							<KeyRound className="h-4 w-4" />
							リカバリーコードを使用
						</Button>
					</>
				)}

				{mode === "setup" && (
					<Button size="lg" className="w-full gap-2" onClick={handleSetup} disabled={loading}>
						{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
						{loading ? "登録中..." : "パスキーを登録する"}
					</Button>
				)}

				{mode === "recover" && (
					<>
						<label className="flex flex-col gap-1 text-sm">
							リカバリーコード
							<input
								value={recoveryInput}
								onChange={(e) => setRecoveryInput(e.target.value.toUpperCase())}
								placeholder="例: ABCD1234EFGH5678"
								className="rounded-md border border-input bg-background px-3 py-2 font-mono text-sm tracking-widest"
							/>
						</label>
						<Button
							size="lg"
							className="w-full gap-2"
							onClick={handleRecover}
							disabled={loading || !recoveryInput.trim()}
						>
							{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <KeyRound className="h-5 w-5" />}
							{loading ? "復元中..." : "リカバリーして再登録"}
						</Button>
						<Button
							variant="ghost"
							size="sm"
							className="w-full text-muted-foreground"
							onClick={() => { setMode("login"); setError(null); }}
							disabled={loading}
						>
							パスキーで認証に戻る
						</Button>
					</>
				)}

				{error && (
					<div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
						<AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
						<span>{error}</span>
					</div>
				)}
			</div>

			{recoveryCode && (
				<RecoveryCodeDialog
					code={recoveryCode}
					onClose={() => {
						setRecoveryCode(null);
						navigate(`/nodes/${node.id}/overview`, { replace: true });
					}}
				/>
			)}
		</div>
	);
}
