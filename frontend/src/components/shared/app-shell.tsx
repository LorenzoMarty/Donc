"use client";

import { useEffect, useRef, useState, type ReactNode, type WheelEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  FilePenLine,
  Gamepad2,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  ShieldCheck,
  User,
  X,
  type LucideIcon,
} from "lucide-react";

import { BrandLink } from "@/components/shared/brand-mark";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/providers/app-providers";
import { useGameStore } from "@/stores/game-store";
import { useSidebarStore } from "@/stores/sidebar-store";
import { cn, initials } from "@/utils";

type WorkspaceNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const workspaceNav: WorkspaceNavItem[] = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/redacao", label: "Redação", icon: FilePenLine },
  { href: "/redacoes", label: "Redações", icon: History },
  { href: "/aulas", label: "Aulas", icon: BookOpen },
  { href: "/games", label: "Atividades", icon: Gamepad2 },
  { href: "/perfil", label: "Perfil", icon: User },
];


export function AppShell({ children }: { children: ReactNode }) {
  const { loading, user, logout } = useAuth();
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const sidebarCollapsed = useSidebarStore((s) => s.collapsed);
  const setSidebarCollapsed = useSidebarStore((s) => s.setCollapsed);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const hydrateFromBackend = useGameStore((s) => s.hydrateFromBackend);

  const navItems = user?.role === "admin" ? [...workspaceNav, { href: "/admin", label: "Administração", icon: ShieldCheck }] : workspaceNav;

  useEffect(() => {
    if (user) hydrateFromBackend();
  }, [user, hydrateFromBackend]);

  useEffect(() => {
    // proxy.ts já bloqueia navegação direta sem sessão válida; isso cobre o caso em que a sessão
    // cai *depois* de montado (401 em qualquer chamada -> AuthProvider zera `user`) — sem isso o
    // shell inteiro continuava renderizado pra um usuário deslogado.
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

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

  if (loading || !user) {
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
    <div className="h-dvh overflow-hidden bg-background text-foreground">
      <MobileHeader onMenuClick={() => setDrawerOpen(true)} />
      <DesktopSidebar
        items={navItems}
        pathname={pathname}
        userName={user?.name ?? "Aluno"}
        onLogout={logout}
        onWheel={scrollContentArea}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <MobileDrawer
        items={navItems}
        open={drawerOpen}
        pathname={pathname}
        userName={user?.name ?? "Aluno"}
        onClose={() => setDrawerOpen(false)}
        onLogout={logout}
      />

      <div
        ref={scrollAreaRef}
        className={cn("h-full overflow-y-auto overscroll-contain", sidebarCollapsed ? "md:pl-[88px]" : "md:pl-[262px]")}
      >
        <main className="min-h-dvh w-full bg-background px-4 pb-4 pt-[calc(4.75rem+env(safe-area-inset-top))] text-foreground md:px-6 md:py-5 xl:px-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function MobileHeader({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-card/95 pt-[env(safe-area-inset-top)] shadow-soft backdrop-blur-xl md:hidden">
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
  onLogout,
  onWheel,
  collapsed,
  onToggleCollapse,
}: {
  items: WorkspaceNavItem[];
  pathname: string;
  userName: string;
  onLogout: () => void;
  onWheel: (event: WheelEvent<HTMLElement>) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  return (
    <aside
      className={cn(
        "fixed inset-y-3 left-3 z-40 hidden flex-col rounded-[18px] bg-card/90 py-5 shadow-elevated backdrop-blur-2xl transition-[width] duration-200 md:flex",
        collapsed ? "w-[64px] px-2" : "w-[236px] px-4",
      )}
      onWheel={onWheel}
    >
      <div className={cn("mb-5 flex items-center gap-2 px-1", collapsed ? "justify-center" : "justify-between")}>
        {collapsed ? null : <BrandLink collapsed={false} href="/dashboard" />}
        <button
          type="button"
          aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          title={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          onClick={onToggleCollapse}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-control text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" aria-hidden="true" /> : <PanelLeftClose className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>

      <div className={cn("mb-5 flex", collapsed && "justify-center")}>
        <Button
          asChild
          className={cn(
            "h-11 rounded-control bg-primary text-[14px] font-semibold shadow-control",
            collapsed ? "w-11 justify-center px-0" : "w-full justify-start gap-2.5",
          )}
        >
          <Link href="/redacao" aria-label="Nova redação" title={collapsed ? "Nova redação" : undefined}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {collapsed ? null : "Nova redação"}
          </Link>
        </Button>
      </div>

      <nav className="flex flex-1 flex-col gap-1" aria-label="Navegação principal">
        {items.map((item) => (
          <ShellNavLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
        ))}
      </nav>

      <div className="mt-2">
        <div
          className={cn(
            "flex min-h-11 items-center rounded-control bg-muted/60 py-2 text-[14px] font-semibold transition-colors hover:bg-muted",
            collapsed ? "flex-col gap-2 px-1" : "justify-between gap-2 px-2",
          )}
        >
          <Link
            href="/perfil"
            className={cn("flex min-w-0 items-center gap-2 text-left transition-colors hover:text-primary", collapsed && "justify-center")}
            aria-label={`Perfil de ${userName}`}
            title={collapsed ? `Perfil de ${userName}` : undefined}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[hsl(var(--accent-600))] text-[14px] font-semibold text-primary-foreground">
              {initials(userName)}
            </span>
            {collapsed ? null : (
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-[13px]">{userName}</span>
              </span>
            )}
          </Link>
          <button
            type="button"
            aria-label="Sair"
            title={collapsed ? "Sair" : undefined}
            onClick={onLogout}
            className="inline-flex shrink-0 items-center gap-2 rounded-control p-2 text-foreground transition-colors hover:bg-card hover:text-primary"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function MobileDrawer({
  items,
  open,
  pathname,
  userName,
  onClose,
  onLogout,
}: {
  items: WorkspaceNavItem[];
  open: boolean;
  pathname: string;
  userName: string;
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
            aria-label="Menu de navegação"
            className="safe-bottom mobile-scroll absolute inset-y-0 left-0 flex w-[min(86vw,22.5rem)] flex-col overflow-y-auto bg-card p-4 shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <BrandLink />
              <Button variant="outline" size="icon" aria-label="Fechar menu" onClick={onClose}>
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>

            <nav className="grid gap-1.5" aria-label="Navegação principal">
              {items.map((item) => (
                <ShellNavLink key={item.href} item={item} pathname={pathname} expanded onNavigate={onClose} />
              ))}
            </nav>

            <div className="mt-auto grid gap-3 pt-8">
              <Link href="/perfil" className="flex items-center gap-3 rounded-control bg-muted/60 p-3" onClick={onClose}>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/12 font-semibold text-[hsl(var(--accent-700))]">
                  {initials(userName)}
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="block text-safe font-semibold">{userName}</span>
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
  expanded = false,
  collapsed = false,
  onNavigate,
}: {
  item: WorkspaceNavItem;
  pathname: string;
  expanded?: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group/nav relative flex min-h-11 items-center gap-3 rounded-control text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground",
        collapsed ? "justify-center px-0" : "px-3.5",
        active ? "font-semibold text-[hsl(var(--accent-700))]" : "hover:bg-primary/8",
      )}
    >
      {active ? (
        <motion.span
          layoutId={expanded ? undefined : "sidebar-active-pill"}
          className="absolute inset-0 rounded-control bg-primary/12"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
        />
      ) : null}
      <Icon className="relative z-10 h-5 w-5 shrink-0 transition-transform duration-150 group-hover/nav:scale-110" aria-hidden="true" />
      {collapsed ? (
        <span className="sr-only">{item.label}</span>
      ) : (
        <span className="text-safe relative z-10 min-w-0 overflow-hidden whitespace-nowrap">{item.label}</span>
      )}
    </Link>
  );
}
