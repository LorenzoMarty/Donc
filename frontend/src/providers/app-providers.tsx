"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";

import { AuthContext, type AuthContextValue } from "@/contexts/auth-context";
import { TooltipProvider } from "@/components/ui/tooltip";
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
    const id = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(id);
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
        // Hard reload intencional: garante que nenhum estado de sessão anterior (React Query,
        // caches em memória) sobreviva no client após logout.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
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
      <TooltipProvider>
        <AuthProvider>{children}</AuthProvider>
      </TooltipProvider>
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  return ctx;
}
