"use client";

import { Bell, LogOut, Moon, Search, Sun, Zap } from "lucide-react";
import { useTheme } from "next-themes";

import { useAuth } from "@/components/app/providers";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/utils";

export function Topbar() {
  const { user, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 border-b bg-background/72 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border bg-card/78 px-3 py-2 text-sm text-muted-foreground shadow-sm">
          <Search className="h-4 w-4" aria-hidden="true" />
          <span className="truncate">Buscar trilhas, temas e competencias</span>
        </div>
        <div className="hidden items-center gap-2 rounded-lg border bg-secondary/14 px-3 py-2 text-sm font-black text-secondary sm:flex">
          <Zap className="h-4 w-4" aria-hidden="true" />
          {user?.xp ?? 0} XP
        </div>
        <Button variant="ghost" size="icon" title="Alternar tema" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
          {resolvedTheme === "dark" ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
        </Button>
        <Button variant="ghost" size="icon" title="Notificacoes">
          <Bell className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div className="hidden items-center gap-3 rounded-lg border bg-card/80 px-3 py-2 shadow-sm md:flex">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-black text-primary-foreground">
            {initials(user?.name ?? "Aluno")}
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold">{user?.name ?? "Aluno"}</p>
            <p className="text-xs text-muted-foreground">Nivel {user?.level ?? 1}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" title="Sair" onClick={logout}>
          <LogOut className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </header>
  );
}

