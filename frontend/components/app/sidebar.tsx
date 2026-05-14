"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, ClipboardList, FilePenLine, GraduationCap, LayoutDashboard, MessageCircle, ShieldCheck, Sparkles, Trophy, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/app/providers";

const nav = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/aulas", label: "Aulas", icon: BookOpen },
  { href: "/exercicios", label: "Exercicios", icon: ClipboardList },
  { href: "/redacao", label: "Redacao", icon: FilePenLine },
  { href: "/redacoes", label: "Historico", icon: BarChart3 },
  { href: "/tutor", label: "IA Tutora", icon: MessageCircle },
  { href: "/simulados", label: "Simulados", icon: Trophy },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r bg-card/72 px-4 py-5 backdrop-blur-xl lg:block">
      <div className="mb-8 flex items-center gap-3 rounded-lg border bg-background/58 p-3 shadow-sm">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-glow">
          <GraduationCap className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs font-black uppercase text-muted-foreground">Lume</p>
          <h1 className="text-xl font-black leading-none tracking-normal">ENEM</h1>
        </div>
      </div>

      <nav className="space-y-1">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-muted-foreground transition-all hover:bg-muted hover:text-foreground",
                active && "bg-primary text-primary-foreground shadow-glow hover:bg-primary hover:text-primary-foreground",
              )}
            >
              <Icon className="h-4 w-4 transition-transform group-hover:scale-110" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
        {user?.role === "admin" && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              pathname.startsWith("/admin") && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
            )}
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Admin
          </Link>
        )}
      </nav>

      <div className="mt-8 rounded-lg border bg-background/62 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <Sparkles className="h-4 w-4 text-secondary" aria-hidden="true" />
          <Badge variant="secondary">Premium</Badge>
        </div>
        <p className="text-sm font-black">Sequencia de evolucao</p>
        <div className="mt-3 flex items-center gap-2 rounded-md bg-secondary/12 px-3 py-2 text-xs font-bold text-secondary">
          <Zap className="h-3.5 w-3.5" aria-hidden="true" />
          +120 XP por redacao
        </div>
      </div>
    </aside>
  );
}
