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
      {!sidebarCollapsed ? (
        <DesktopSidebar
          items={navItems}
          pathname={pathname}
          userName={user?.name ?? "Aluno"}
          onLogout={logout}
          onWheel={scrollContentArea}
          onCollapse={() => setSidebarCollapsed(true)}
        />
      ) : (
        <button
          type="button"
          aria-label="Abrir menu lateral"
          title="Abrir menu lateral"
          onClick={() => setSidebarCollapsed(false)}
          className="fixed left-3 top-3 z-40 hidden h-10 w-10 place-items-center rounded-control bg-card/90 text-muted-foreground shadow-elevated backdrop-blur-2xl transition-colors hover:text-primary md:grid"
        >
          <PanelLeftOpen className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
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
        className={cn("h-full overflow-y-auto overscroll-contain", sidebarCollapsed ? "md:pl-0" : "md:pl-[262px]")}
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
  onCollapse,
}: {
  items: WorkspaceNavItem[];
  pathname: string;
  userName: string;
  onLogout: () => void;
  onWheel: (event: WheelEvent<HTMLElement>) => void;
  onCollapse: () => void;
}) {
  return (
    <aside
      className="fixed inset-y-3 left-3 z-40 hidden w-[236px] flex-col rounded-[18px] bg-card/90 py-5 px-4 shadow-elevated backdrop-blur-2xl md:flex"
      onWheel={onWheel}
    >
      <div className="mb-5 flex items-center justify-between gap-2 px-1">
        <BrandLink collapsed={false} href="/dashboard" />
        <button
          type="button"
          aria-label="Recolher menu lateral"
          title="Recolher menu lateral"
          onClick={onCollapse}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-control text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
        >
          <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mb-5">
        <Button asChild className="h-11 w-full justify-start gap-2.5 rounded-control bg-primary text-[14px] font-semibold shadow-control">
          <Link href="/redacao">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nova redação
          </Link>
        </Button>
      </div>

      <nav className="flex flex-1 flex-col gap-1" aria-label="Navegação principal">
        {items.map((item) => (
          <ShellNavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      <div className="mt-2">
        <div className="flex min-h-11 items-center justify-between gap-2 rounded-control bg-muted/60 px-2 py-2 text-[14px] font-semibold transition-colors hover:bg-muted">
          <Link
            href="/perfil"
            className="flex min-w-0 items-center gap-2 text-left transition-colors hover:text-primary"
            aria-label={`Perfil de ${userName}`}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-[14px] font-semibold text-primary-foreground">
              {initials(userName)}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[13px]">{userName}</span>
            </span>
          </Link>
          <button
            type="button"
            aria-label="Sair"
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
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/12 font-semibold text-primary">
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
  onNavigate,
}: {
  item: WorkspaceNavItem;
  pathname: string;
  expanded?: boolean;
  onNavigate?: () => void;
}) {
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "group/nav relative flex min-h-11 items-center gap-3 rounded-control px-3.5 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground",
        active ? "font-semibold text-primary" : "hover:bg-primary/8",
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
      <span className="text-safe relative z-10 min-w-0 overflow-hidden whitespace-nowrap">{item.label}</span>
    </Link>
  );
}
