"use client";

import { useEffect, useRef, useState, type ReactNode, type WheelEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  ChevronRight,
  FilePenLine,
  Gamepad2,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";

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
  { href: "/aulas", label: "Aulas", icon: BookOpen },
  { href: "/games", label: "Jogos", icon: Gamepad2 },
  { href: "/redacao", label: "Redacao", icon: FilePenLine },
  { href: "/redacoes", label: "Historico", icon: BarChart3 },
];

const SIDEBAR_WIDTH_EXPANDED = 288;
const SIDEBAR_WIDTH_COLLAPSED = 80;

export function AppShell({ children }: { children: ReactNode }) {
  const { loading, user, logout } = useAuth();
  const pathname = usePathname() ?? "";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const rankName = getRankSnapshot(user?.xp ?? 0).current.name;
  const hydrateFromBackend = useGameStore((s) => s.hydrateFromBackend);

  const navItems =
    user?.role === "admin"
      ? [...workspaceNav, { href: "/admin", label: "Administracao", icon: ShieldCheck }]
      : workspaceNav;

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("sidebar-collapsed") === "true");
    } catch {}
  }, []);

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
    <div className="website-shell h-dvh overflow-hidden bg-background text-foreground">
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

      <motion.div
        ref={scrollAreaRef}
        className="h-full overflow-y-auto overscroll-contain"
        animate={{ paddingLeft: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED }}
        transition={{ duration: 0.22, ease: "easeInOut" }}
        style={{ paddingLeft: SIDEBAR_WIDTH_COLLAPSED }}
      >
        <div className="md:hidden">
          {/* mobile: reset padding applied by motion on small screens */}
        </div>
        <main className="mx-auto min-h-[calc(100dvh-10rem)] w-full max-w-[1600px] px-3 pb-4 pt-[calc(4.5rem+env(safe-area-inset-top))] xs:px-4 md:px-5 md:pt-5 lg:px-6 lg:py-6 2xl:px-8">
          {children}
        </main>

        <footer className="mx-auto w-full max-w-[1600px] px-3 pb-5 pt-2 xs:px-4 md:px-5 lg:px-6 lg:pb-6 2xl:px-8">
          <div className="game-surface flex flex-col justify-between gap-3 bg-card p-3 text-sm text-muted-foreground sm:flex-row sm:items-center">
            <p className="min-w-0 leading-6">Donc ENEM transforma Portugues e Redacao em progresso intelectual mensuravel.</p>
            <Link href="/pricing" className="inline-flex min-h-11 items-center gap-2 font-semibold text-foreground">
              Ver planos
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </footer>
      </motion.div>
    </div>
  );
}

function MobileHeader({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/88 pt-[env(safe-area-inset-top)] backdrop-blur-xl md:hidden">
      <div className="flex min-h-16 items-center justify-between gap-3 px-3 xs:px-4">
        <BrandLink compact />
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
    <motion.aside
      className="fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border bg-background/88 py-4 backdrop-blur-xl md:flex"
      animate={{ width: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED }}
      transition={{ duration: 0.22, ease: "easeInOut" }}
      style={{ width: SIDEBAR_WIDTH_COLLAPSED }}
      onWheel={onWheel}
    >
      <div className="mb-5 flex items-center justify-between gap-2 overflow-hidden px-3">
        <BrandLink collapsed={collapsed} />
        <button
          onClick={onToggle}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
          ) : (
            <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1.5 overflow-hidden px-3" aria-label="Navegacao principal">
        {items.map((item) => (
          <ShellNavLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
        ))}
      </nav>

      <div className="mt-5 grid gap-2 overflow-hidden px-3">
        <Link
          href="/perfil"
          className="game-tile flex min-h-12 items-center justify-center gap-3 bg-card/72 px-2 py-2 text-sm font-semibold transition-colors"
          aria-label={`Perfil de ${userName}`}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-sm border border-primary/30 bg-primary text-sm font-semibold text-primary-foreground">
            {initials(userName)}
          </span>
          <motion.span
            className="min-w-0 leading-tight"
            animate={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : "auto" }}
            transition={{ duration: 0.18 }}
            style={{ overflow: "hidden", whiteSpace: "nowrap" }}
          >
            <span className="block text-safe">{userName}</span>
            <span className="block text-xs font-medium text-muted-foreground">Rank {userRankName}</span>
          </motion.span>
        </Link>
        {collapsed ? (
          <Button variant="outline" size="icon" aria-label="Sair" onClick={onLogout}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button variant="outline" onClick={onLogout}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sair
          </Button>
        )}
      </div>
    </motion.aside>
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
    <AnimatePresence>
      {open ? (
        <motion.div className="fixed inset-0 z-[60] md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button className="absolute inset-0 bg-foreground/28 backdrop-blur-sm" aria-label="Fechar menu" onClick={onClose} />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navegacao"
            className="safe-bottom mobile-scroll absolute inset-y-0 left-0 flex w-[min(86vw,22.5rem)] flex-col overflow-y-auto border-r border-border bg-background p-4 shadow-2xl"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.22, ease: "easeOut" }}
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
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-sm border border-primary/30 bg-primary font-semibold text-primary-foreground">
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
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
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
        "game-tile flex min-h-12 items-center gap-3 bg-card/45 px-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground",
        showLabel ? "justify-start" : "justify-center",
        active && "border-primary/45 bg-primary text-primary-foreground shadow-sm hover:text-primary-foreground",
      )}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <motion.span
        className="min-w-0 text-safe"
        animate={{ opacity: showLabel ? 1 : 0, width: showLabel ? "auto" : 0 }}
        transition={{ duration: 0.18 }}
        style={{ overflow: "hidden", whiteSpace: "nowrap" }}
      >
        {item.label}
      </motion.span>
    </Link>
  );
}

function BrandLink({ compact = false, collapsed = false }: { compact?: boolean; collapsed?: boolean }) {
  const showText = !compact && !collapsed;
  return (
    <Link href="/dashboard" className={cn("flex min-w-0 items-center gap-3", !compact && !collapsed && "md:justify-start")}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-primary/35 bg-primary text-sm font-semibold text-primary-foreground">
        D
      </span>
      <motion.span
        className="min-w-0 leading-tight"
        animate={{ opacity: showText ? 1 : 0, width: showText ? "auto" : 0 }}
        transition={{ duration: 0.18 }}
        style={{ overflow: "hidden", whiteSpace: "nowrap" }}
      >
        <span className="flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
          Donc ENEM
        </span>
        <span className="block text-lg font-semibold tracking-normal">Area ENEM</span>
      </motion.span>
    </Link>
  );
}
