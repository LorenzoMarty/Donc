"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type WheelEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  FilePenLine,
  Gamepad2,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  ShieldCheck,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";

import { BrandLink } from "@/components/shared/brand-mark";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getRankSnapshot } from "@/features/xp/xp";
import { useAuth } from "@/providers/app-providers";
import { useGameStore } from "@/stores/game-store";
import { cn, initials } from "@/utils";

type WorkspaceNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const workspaceNav: WorkspaceNavItem[] = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/redacao", label: "Redação", icon: FilePenLine },
  { href: "/redacoes", label: "Histórico", icon: BarChart3 },
  { href: "/aulas", label: "Aulas", icon: BookOpen },
  { href: "/games", label: "Atividades", icon: Gamepad2 },
];

const SIDEBAR_WIDTH_EXPANDED = 224;
const SIDEBAR_WIDTH_COLLAPSED = 72;

export function AppShell({ children }: { children: ReactNode }) {
  const { loading, user, logout } = useAuth();
  const pathname = usePathname() ?? "";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const rankName = getRankSnapshot(user?.xp ?? 0).current.name;
  const hydrateFromBackend = useGameStore((s) => s.hydrateFromBackend);

  const navItems = user?.role === "admin" ? [...workspaceNav, { href: "/admin", label: "Administracao", icon: ShieldCheck }] : workspaceNav;

  useEffect(() => {
    if (user) hydrateFromBackend();
  }, [user, hydrateFromBackend]);

  function toggleSidebar() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sidebar-collapsed", String(next));
      } catch {}
      return next;
    });
  }

  function scrollContentArea(event: WheelEvent<HTMLElement>) {
    scrollAreaRef.current?.scrollBy({
      top: event.deltaY,
      left: event.deltaX,
      behavior: "auto",
    });
  }

  useEffect(() => {
    if (!drawerOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [drawerOpen]);

  if (loading) {
    return (
      <main className="website-shell grid min-h-screen place-items-center bg-background p-4 xs:p-6">
        <div className="game-surface w-full max-w-md p-5 xs:p-6">
          <Skeleton className="mb-5 h-12 w-36" />
          <Skeleton className="mb-3 h-4 w-full" />
          <Skeleton className="mb-3 h-4 w-5/6" />
          <Skeleton className="h-12 w-full" />
        </div>
      </main>
    );
  }

  return (
    <div className="h-dvh overflow-hidden bg-white text-foreground">
      <MobileHeader onMenuClick={() => setDrawerOpen(true)} />
      <DesktopSidebar
        items={navItems}
        pathname={pathname}
        userName={user?.name ?? "Aluno"}
        userRankName={rankName}
        collapsed={collapsed}
        onToggle={toggleSidebar}
        onLogout={logout}
        onWheel={scrollContentArea}
      />
      <MobileDrawer
        items={navItems}
        open={drawerOpen}
        pathname={pathname}
        userName={user?.name ?? "Aluno"}
        userRankName={rankName}
        onClose={() => setDrawerOpen(false)}
        onLogout={logout}
      />

      <div
        ref={scrollAreaRef}
        className="h-full overflow-y-auto overscroll-contain transition-[padding-left] duration-200 ease-in-out md:pl-[var(--sidebar-width)]"
        style={{ "--sidebar-width": `${collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED}px` } as CSSProperties}
      >
        <main className="min-h-dvh w-full bg-white px-4 pb-4 pt-[calc(4.75rem+env(safe-area-inset-top))] text-foreground md:px-6 md:py-5 xl:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function MobileHeader({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-card/95 pt-[env(safe-area-inset-top)] backdrop-blur-xl md:hidden">
      <div className="flex min-h-16 items-center justify-between gap-3 px-3 xs:px-4">
        <BrandLink compact href="/dashboard" />
        <Button variant="outline" size="icon" aria-label="Abrir menu" onClick={onMenuClick}>
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>
    </header>
  );
}

function DesktopSidebar({
  items,
  pathname,
  userName,
  userRankName,
  collapsed,
  onToggle,
  onLogout,
  onWheel,
}: {
  items: WorkspaceNavItem[];
  pathname: string;
  userName: string;
  userRankName: string;
  collapsed: boolean;
  onToggle: () => void;
  onLogout: () => void;
  onWheel: (event: WheelEvent<HTMLElement>) => void;
}) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border/80 bg-white transition-[width,padding] duration-200 ease-in-out md:flex",
        collapsed ? "py-4" : "py-5",
      )}
      style={{ width: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED }}
      onWheel={onWheel}
    >
      <div
        className={cn(
          "mb-5 flex overflow-hidden",
          collapsed ? "flex-col items-center gap-3 px-3" : "items-center justify-between gap-2 px-4",
        )}
      >
        <BrandLink collapsed={collapsed} href="/dashboard" className={collapsed ? "w-full justify-center" : undefined} />
        <button
          onClick={onToggle}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className={cn(
            "grid shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-primary/7 hover:text-primary",
            collapsed ? "h-9 w-9 border border-border/80 bg-white" : "h-8 w-8",
          )}
        >
          {collapsed ? <PanelLeftOpen className="h-5 w-5" aria-hidden="true" /> : <PanelLeftClose className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>

      <div className={cn("mb-6 overflow-hidden", collapsed ? "px-3" : "px-4")}>
        {collapsed ? (
          <Button asChild size="icon" aria-label="Nova redação" className="h-10 w-full">
            <Link href="/redacao">
              <Plus className="h-6 w-6" aria-hidden="true" />
            </Link>
          </Button>
        ) : (
          <Button asChild className="h-10 w-full justify-start text-base">
            <Link href="/redacao">
              <Plus className="h-5 w-5" aria-hidden="true" />
              Nova redação
            </Link>
          </Button>
        )}
      </div>

      <nav
        className={cn("flex flex-1 flex-col overflow-hidden", collapsed ? "gap-2.5 px-3" : "gap-1.5 px-4")}
        aria-label="Navegacao principal"
      >
        {items.map((item) => (
          <ShellNavLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
        ))}
      </nav>

      {!collapsed ? (
        <div className="mx-4 mb-3 rounded-md border border-primary/15 bg-primary/5 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Aproveite melhor o Donc
          </div>
          <p className="text-sm leading-5 text-muted-foreground">Explore recursos para elevar sua escrita.</p>
          <Button asChild variant="outline" size="sm" className="mt-3 w-full justify-between">
            <Link href="/onboarding">Ver tour</Link>
          </Button>
        </div>
      ) : null}

      <div className={cn("mt-2 overflow-hidden", collapsed ? "grid gap-2 px-3" : "px-4")}>
        {!collapsed ? (
          <div className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-border/80 bg-white px-2 py-2 text-base font-semibold transition-colors">
            <Link
              href="/perfil"
              className="flex min-w-0 items-center gap-2 text-left transition-colors hover:text-primary"
              aria-label={`Perfil de ${userName}`}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-primary/20 bg-primary/10 text-xs font-semibold text-primary">
                {initials(userName)}
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-base">{userName}</span>
                <span className="block truncate text-sm font-medium text-muted-foreground">Rank {userRankName}</span>
              </span>
            </Link>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex shrink-0 items-center gap-2 rounded-sm text-foreground transition-colors hover:text-primary"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sair
            </button>
          </div>
        ) : null}
        <button
          type="button"
          aria-label="Sair"
          onClick={onLogout}
          className={cn(
            "min-h-11 rounded-md border border-border/80 bg-white text-sm font-semibold transition-colors hover:bg-muted/60 hover:text-primary",
            collapsed ? "flex h-10 w-full items-center justify-center" : "hidden",
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
        </button>
        {collapsed ? (
          <Link
            href="/perfil"
            className="grid h-10 w-full place-items-center rounded-md border border-border/80 bg-white transition-colors hover:bg-muted/60"
            aria-label={`Perfil de ${userName}`}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-primary/20 bg-primary/10 text-xs font-semibold text-primary">
              {initials(userName)}
            </span>
          </Link>
        ) : null}
      </div>
    </aside>
  );
}

function MobileDrawer({
  items,
  open,
  pathname,
  userName,
  userRankName,
  onClose,
  onLogout,
}: {
  items: WorkspaceNavItem[];
  open: boolean;
  pathname: string;
  userName: string;
  userRankName: string;
  onClose: () => void;
  onLogout: () => void;
}) {
  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button className="absolute inset-0 bg-foreground/28 backdrop-blur-sm" aria-label="Fechar menu" onClick={onClose} />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navegacao"
            className="safe-bottom mobile-scroll absolute inset-y-0 left-0 flex w-[min(86vw,22.5rem)] flex-col overflow-y-auto border-r border-border bg-background p-4 shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <BrandLink />
              <Button variant="outline" size="icon" aria-label="Fechar menu" onClick={onClose}>
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>

            <nav className="grid gap-1.5" aria-label="Navegacao principal">
              {items.map((item) => (
                <ShellNavLink key={item.href} item={item} pathname={pathname} expanded onNavigate={onClose} />
              ))}
            </nav>

            <div className="mt-auto grid gap-3 pt-8">
              <Link href="/perfil" className="game-surface flex items-center gap-3 bg-card p-3" onClick={onClose}>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-primary/20 bg-primary/10 font-semibold text-primary">
                  {initials(userName)}
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="block text-safe font-semibold">{userName}</span>
                  <span className="block text-sm text-muted-foreground">Rank {userRankName}</span>
                </span>
              </Link>
              <Button variant="outline" onClick={onLogout}>
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sair
              </Button>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function ShellNavLink({
  item,
  pathname,
  collapsed = false,
  expanded = false,
  onNavigate,
}: {
  item: WorkspaceNavItem;
  pathname: string;
  collapsed?: boolean;
  expanded?: boolean;
  onNavigate?: () => void;
}) {
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;
  const showLabel = expanded || !collapsed;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-md border border-transparent text-base font-semibold text-muted-foreground transition-colors hover:bg-primary/6 hover:text-primary",
        collapsed ? "h-10 justify-center px-0" : "min-h-10 px-3",
        showLabel ? "justify-start" : "justify-center",
        active && "bg-primary/8 text-primary hover:bg-primary/10 hover:text-primary",
      )}
    >
      <Icon className={cn("shrink-0", collapsed ? "h-5 w-5" : "h-5 w-5")} aria-hidden="true" />
      <span
        className={cn(
          "min-w-0 overflow-hidden whitespace-nowrap text-safe transition-opacity duration-150",
          showLabel ? "opacity-100" : "w-0 opacity-0",
        )}
      >
        {item.label}
      </span>
    </Link>
  );
}
