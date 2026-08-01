import { create } from "zustand";
import { isTokenExpired } from "@renderer/lib/node-api-client";

interface NodeSession {
	token: string;
	expiresAt: number;
}

interface AuthState {
	sessions: Record<string, NodeSession | undefined>;
	setSession: (nodeId: string, token: string, expiresInMinutes: number) => void;
	getToken: (nodeId: string) => string | null;
	clearSession: (nodeId: string) => void;
	isAuthenticated: (nodeId: string) => boolean;
	restoreFromSecureStore: (nodeId: string) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
	sessions: {},

	setSession(nodeId, token, expiresInMinutes) {
		const expiresAt = Date.now() + expiresInMinutes * 60 * 1000;
		set((s) => ({ sessions: { ...s.sessions, [nodeId]: { token, expiresAt } } }));
		void window.api.secure.setToken(nodeId, token);
	},

	getToken(nodeId) {
		const session = get().sessions[nodeId];
		if (!session) return null;
		if (session.expiresAt <= Date.now() || isTokenExpired(session.token)) {
			set((s) => {
				const next = { ...s.sessions };
				delete next[nodeId];
				return { sessions: next };
			});
			return null;
		}
		return session.token;
	},

	clearSession(nodeId) {
		set((s) => {
			const next = { ...s.sessions };
			delete next[nodeId];
			return { sessions: next };
		});
		void window.api.secure.deleteToken(nodeId);
	},

	isAuthenticated(nodeId) {
		return get().getToken(nodeId) !== null;
	},

	async restoreFromSecureStore(nodeId) {
		const stored = await window.api.secure.getToken(nodeId);
		if (!stored || isTokenExpired(stored)) return false;
		set((s) => ({
			sessions: {
				...s.sessions,
				[nodeId]: { token: stored, expiresAt: Date.now() + 60 * 60 * 1000 },
			},
		}));
		return true;
	},
}));
