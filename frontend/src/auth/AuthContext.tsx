import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { LoginRequest, RegisterRequest, UserRead } from "../api/types";
import { AUTH_EVENT, clearSession, readSession, writeSession, type AuthSession } from "./session";

interface AuthContextValue {
  session: AuthSession | null;
  user: UserRead | null;
  isAuthenticated: boolean;
  isPrivileged: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  register: (payload: RegisterRequest, bootstrapToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => readSession());

  useEffect(() => {
    const onAuthEvent = (event: Event) => {
      setSession((event as CustomEvent<AuthSession | null>).detail);
    };
    window.addEventListener(AUTH_EVENT, onAuthEvent);
    return () => window.removeEventListener(AUTH_EVENT, onAuthEvent);
  }, []);

  const login = useCallback(async (payload: LoginRequest) => {
    const response = await api.auth.login(payload);
    setSession(writeSession(response));
  }, []);

  const register = useCallback(async (payload: RegisterRequest, bootstrapToken?: string) => {
    const response = await api.auth.register(payload, bootstrapToken);
    setSession(writeSession(response));
  }, []);

  const logout = useCallback(async () => {
    const current = readSession();
    clearSession();
    setSession(null);
    if (current?.refresh_token) {
      try {
        await api.auth.logout(current.refresh_token);
      } catch {
        // Local session is already cleared; server-side revocation can fail if the token expired.
      }
    }
  }, []);

  const refreshMe = useCallback(async () => {
    const current = readSession();
    if (!current) {
      setSession(null);
      return;
    }
    const user = await api.auth.me();
    setSession(writeSession({ ...current, user }));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isAuthenticated: Boolean(session?.access_token),
      isPrivileged: session?.user.role === "admin" || session?.user.role === "organizer",
      login,
      register,
      logout,
      refreshMe,
    }),
    [login, logout, refreshMe, register, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
