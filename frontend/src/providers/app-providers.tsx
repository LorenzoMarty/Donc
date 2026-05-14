"use client";

import { ThemeProvider } from "next-themes";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";

import { AuthContext, type AuthContextValue } from "@/contexts/auth-context";
import { authApi, type User } from "@/services/api";

function setSession(token: string) {
  window.localStorage.setItem("access_token", token);
  document.cookie = `access_token=${token}; path=/; max-age=604800; SameSite=Lax`;
}

function clearSession() {
  window.localStorage.removeItem("access_token");
  document.cookie = "access_token=; path=/; max-age=0; SameSite=Lax";
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = window.localStorage.getItem("access_token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    document.cookie = `access_token=${token}; path=/; max-age=604800; SameSite=Lax`;
    try {
      setUser(await authApi.me());
    } catch {
      clearSession();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      refresh,
      login: async (email: string, password: string) => {
        const payload = await authApi.login(email, password);
        setSession(payload.access_token);
        setUser(payload.user);
      },
      register: async (name: string, email: string, password: string) => {
        const payload = await authApi.register(name, email, password);
        setSession(payload.access_token);
        setUser(payload.user);
      },
      logout: () => {
        clearSession();
        setUser(null);
        window.location.href = "/login";
      },
    }),
    [loading, refresh, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  return ctx;
}
