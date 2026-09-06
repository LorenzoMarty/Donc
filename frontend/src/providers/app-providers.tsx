"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";

import { AuthContext, type AuthContextValue } from "@/contexts/auth-context";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AUTH_UNAUTHORIZED_EVENT } from "@/lib/http-client";
import { authApi, type User } from "@/services/api";
import { ensureGameStoreOwner } from "@/stores/game-store";
import { ensureHighlightsStoreOwner } from "@/stores/highlights-store";
import { ensureFreePostItsStoreOwner } from "@/stores/free-post-its-store";

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    // Sessão vive num cookie httpOnly (nunca legível por JS) — a única forma de saber se existe
    // é perguntar ao backend. `credentials: "include"` (http-client.ts) já manda o cookie.
    try {
      const me = await authApi.me();
      ensureGameStoreOwner(me.id);
      ensureHighlightsStoreOwner(me.id);
      ensureFreePostItsStoreOwner(me.id);
      setUser(me);
    } catch {
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

  useEffect(() => {
    function handleUnauthorized() {
      setUser(null);
    }
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      refresh,
      login: async (email: string, password: string) => {
        const payload = await authApi.login(email, password);
        ensureGameStoreOwner(payload.user.id);
        ensureHighlightsStoreOwner(payload.user.id);
        ensureFreePostItsStoreOwner(payload.user.id);
        setUser(payload.user);
      },
      register: async (name: string, email: string, password: string) => {
        const payload = await authApi.register(name, email, password);
        ensureGameStoreOwner(payload.user.id);
        ensureHighlightsStoreOwner(payload.user.id);
        ensureFreePostItsStoreOwner(payload.user.id);
        setUser(payload.user);
      },
      logout: () => {
        setUser(null);
        authApi.logout().catch(() => undefined).finally(() => {
          // Hard reload intencional: garante que nenhum estado de sessão anterior (caches em
          // memória, stores client-side) sobreviva no client após logout.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.href = "/login";
        });
      },
    }),
    [loading, refresh, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light">
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
