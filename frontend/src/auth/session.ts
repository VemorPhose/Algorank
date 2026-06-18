import type { TokenResponse } from "../api/types";

const STORAGE_KEY = "algorank.session";
export const AUTH_EVENT = "algorank:auth-session";

export interface AuthSession extends TokenResponse {
  saved_at: number;
}

export function readSession(): AuthSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed.access_token || !parsed.refresh_token || !parsed.user) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeSession(response: TokenResponse): AuthSession {
  const session: AuthSession = {
    ...response,
    saved_at: Date.now(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new CustomEvent<AuthSession | null>(AUTH_EVENT, { detail: session }));
  return session;
}

export function clearSession(): void {
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent<AuthSession | null>(AUTH_EVENT, { detail: null }));
}
