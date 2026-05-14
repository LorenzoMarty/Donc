"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, FilePenLine, Home, MessageCircle, Trophy } from "lucide-react";

import { useAuth } from "@/components/app/providers";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const mobileDock = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/aulas", label: "Aulas", icon: BookOpen },
  { href: "/redacao", label: "Texto", icon: FilePenLine },
  { href: "/tutor", label: "IA", icon: MessageCircle },
  { href: "/simulados", label: "Rank", icon: Trophy },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <main className="soft-grid grid min-h-screen place-items-center bg-background p-6">
        <div className="glass-surface w-full max-w-md rounded-lg p-6">
          <Skeleton className="mb-5 h-12 w-36" />
          <Skeleton className="mb-3 h-4 w-full" />
          <Skeleton className="mb-3 h-4 w-5/6" />
          <Skeleton className="h-12 w-full" />
        </div>
      </main>
    );
  }

  return (
    <div className="soft-grid flex min-h-screen bg-background">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <Topbar />
        <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-5 md:px-6 md:py-8">{children}</main>
        <MobileDock />
      </div>
    </div>
  );
}

function MobileDock() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-3 left-3 right-3 z-40 grid grid-cols-5 gap-1 rounded-lg border bg-card/88 p-1 shadow-glow backdrop-blur-xl lg:hidden">
      {mobileDock.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-md py-2 text-[11px] font-bold text-muted-foreground transition-all",
              active && "bg-primary text-primary-foreground shadow-sm",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
