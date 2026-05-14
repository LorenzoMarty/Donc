"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, ChevronRight, ClipboardList, FilePenLine, LayoutDashboard, Medal, MessageCircle, ShieldCheck, Sparkles, UserRound } from "lucide-react";

import { useAuth } from "@/providers/app-providers";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, initials } from "@/utils";

const workspaceNav = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/aulas", label: "Aulas", icon: BookOpen },
  { href: "/exercicios", label: "Jogos", icon: ClipboardList },
  { href: "/redacao", label: "Redação", icon: FilePenLine },
  { href: "/conquistas", label: "Conquistas", icon: Medal },
  { href: "/redacoes", label: "Histórico", icon: BarChart3 },
  { href: "/tutor", label: "IA Tutora", icon: MessageCircle },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { loading, user, logout } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <main className="website-shell grid min-h-screen place-items-center bg-background p-6">
        <div className="game-surface w-full max-w-md p-6">
          <Skeleton className="mb-5 h-12 w-36" />
          <Skeleton className="mb-3 h-4 w-full" />
          <Skeleton className="mb-3 h-4 w-5/6" />
          <Skeleton className="h-12 w-full" />
        </div>
      </main>
    );
  }

  return (
    <div className="website-shell min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b-2 border-foreground bg-background/96 backdrop-blur">
        <div className="mx-auto flex min-h-20 w-full max-w-7xl flex-col gap-3 px-4 py-3 md:px-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center justify-between gap-4">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl border-2 border-foreground bg-primary text-primary-foreground shadow-[0_4px_0_hsl(var(--foreground))]">
                <span className="text-sm font-black">D</span>
              </div>
              <div>
                <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-primary" aria-hidden="true" />
                  Donk ENEM
                </p>
                <p className="text-lg font-black tracking-normal">Área ENEM</p>
              </div>
            </Link>
            <div className="flex items-center gap-2 xl:hidden">
              <Link href="/perfil" className="grid h-11 w-11 place-items-center rounded-2xl border-2 border-foreground bg-card shadow-[0_3px_0_hsl(var(--foreground))]">
                <UserRound className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <nav className="flex gap-2 overflow-x-auto pb-1 no-scrollbar xl:justify-center xl:pb-0">
            {workspaceNav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-2xl border-2 border-foreground bg-card px-3 text-sm font-black text-muted-foreground shadow-[0_3px_0_hsl(var(--foreground))] transition-all hover:-translate-y-0.5 hover:bg-primary/14 hover:text-foreground",
                    active && "bg-primary text-primary-foreground shadow-[0_5px_0_hsl(var(--foreground))] hover:bg-primary hover:text-primary-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
            {user?.role === "admin" && (
              <Link
                href="/admin"
                className={cn(
                  "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-2xl border-2 border-foreground bg-card px-3 text-sm font-black text-muted-foreground shadow-[0_3px_0_hsl(var(--foreground))] transition-all hover:-translate-y-0.5 hover:bg-primary/14 hover:text-foreground",
                  pathname.startsWith("/admin") && "bg-primary text-primary-foreground",
                )}
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                Administração
              </Link>
            )}
          </nav>

          <div className="hidden items-center gap-3 xl:flex">
            <Link href="/perfil" className="flex items-center gap-3 rounded-2xl border-2 border-foreground bg-card py-1.5 pl-1.5 pr-4 shadow-[0_3px_0_hsl(var(--foreground))] transition-all hover:-translate-y-0.5">
              <div className="grid h-9 w-9 place-items-center rounded-xl border-2 border-foreground bg-secondary text-sm font-black text-secondary-foreground">
                {initials(user?.name ?? "Aluno")}
              </div>
              <div className="leading-tight">
                <p className="text-sm font-black">{user?.name ?? "Aluno"}</p>
                <p className="text-xs text-muted-foreground">Nível {user?.level ?? 1}</p>
              </div>
            </Link>
            <Button variant="outline" onClick={logout}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-5 md:px-6 md:py-8">{children}</main>

      <footer className="mx-auto w-full max-w-7xl px-4 pb-8 pt-4 md:px-6">
        <div className="game-surface flex flex-col justify-between gap-3 bg-card p-4 text-sm text-muted-foreground md:flex-row md:items-center">
          <p>Donk ENEM transforma Português e Redação em progresso intelectual mensurável.</p>
          <Link href="/pricing" className="inline-flex items-center gap-2 font-bold text-foreground">
            Ver planos
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </footer>
    </div>
  );
}
