import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

const links = [
  { href: "/plataforma", label: "Plataforma" },
  { href: "/trilhas", label: "Trilhas" },
  { href: "/redacao", label: "Redação" },
  { href: "/conquistas", label: "Conquistas" },
  { href: "/pricing", label: "Planos" },
  { href: "/sobre", label: "Sobre" },
];

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="website-shell min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b-2 border-foreground bg-background/96 backdrop-blur">
        <div className="mx-auto flex min-h-[72px] w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border-2 border-foreground bg-primary text-sm font-black text-primary-foreground shadow-[0_4px_0_hsl(var(--foreground))]">D</div>
            <div>
              <p className="text-lg font-black leading-none tracking-normal">Donk ENEM</p>
              <p className="text-xs font-bold text-muted-foreground">Português e Redação</p>
            </div>
          </Link>
          <nav className="hidden items-center gap-2 rounded-2xl border-2 border-foreground bg-card/78 p-1 shadow-[0_3px_0_hsl(var(--foreground))] lg:flex">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-xl px-3 py-2 text-sm font-black text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground">
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild>
              <Link href="/cadastro">
                Começar
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {children}

      <footer className="mt-16 border-t-2 border-foreground bg-foreground text-background">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[1.1fr_0.9fr] md:px-6">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-background/10 px-3 py-1 text-xs font-black text-background/72">
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              EdTech moderna para ENEM
            </div>
            <h2 className="max-w-2xl text-3xl font-black tracking-normal md:text-5xl">Estudo com ritmo, não com apostila digital.</h2>
          </div>
          <div className="grid gap-3 text-sm text-background/70 sm:grid-cols-2">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="font-bold transition-colors hover:text-primary">
                {link.label}
              </Link>
            ))}
            <Link href="/login" className="font-bold transition-colors hover:text-primary">
              Entrar
            </Link>
            <Link href="/dashboard" className="font-bold transition-colors hover:text-primary">
              Painel
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
