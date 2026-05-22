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
      <header className="sticky top-0 z-50 border-b border-border bg-background/82 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[72px] w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6 lg:flex-nowrap">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md border border-primary/35 bg-primary text-sm font-semibold text-primary-foreground">
              D
            </div>
            <div className="min-w-0">
              <p className="text-lg font-semibold leading-none tracking-normal">Donk ENEM</p>
              <p className="text-xs font-medium text-muted-foreground">Português e Redação</p>
            </div>
          </Link>
          <nav className="mobile-scroll order-3 flex w-full items-center gap-1 overflow-x-auto rounded-md border border-border bg-card/72 p-1 no-scrollbar lg:order-none lg:w-auto">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="shrink-0 rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
              >
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

      <footer className="mt-16 border-t border-border bg-card/52 text-foreground">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[1.1fr_0.9fr] md:px-6">
          <div>
            <div className="game-chip mb-5 inline-flex items-center gap-2 bg-primary/10 px-3 py-1 text-xs font-semibold text-secondary">
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              EdTech moderna para ENEM
            </div>
            <h2 className="max-w-2xl text-3xl font-semibold tracking-normal md:text-4xl">Estudo com ritmo, não com apostila digital.</h2>
          </div>
          <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="font-semibold transition-colors hover:text-secondary">
                {link.label}
              </Link>
            ))}
            <Link href="/login" className="font-semibold transition-colors hover:text-secondary">
              Entrar
            </Link>
            <Link href="/dashboard" className="font-semibold transition-colors hover:text-secondary">
              Painel
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
