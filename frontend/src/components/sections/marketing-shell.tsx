import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { BrandLink } from "@/components/shared/brand-mark";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/plataforma", label: "Plataforma" },
  { href: "/trilhas", label: "Trilhas" },
  { href: "/redacao", label: "Redação" },
  { href: "/pricing", label: "Planos" },
  { href: "/sobre", label: "Sobre" },
];

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing-page min-h-screen text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/90 backdrop-blur-xl">
        <div className="marketing-container flex min-h-[72px] flex-wrap items-center justify-between gap-x-6 gap-y-3 py-3">
          <BrandLink href="/" />
          <nav className="order-3 flex w-full flex-wrap items-center gap-x-4 gap-y-2 sm:order-none sm:w-auto sm:gap-x-5">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-semibold text-[hsl(var(--neutral-600))] decoration-primary decoration-2 underline-offset-4 transition-colors hover:text-foreground hover:underline"
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
                Começar agora
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {children}

      <footer className="mt-16 border-t border-border text-foreground">
        <div className="marketing-container grid gap-8 py-10 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <BrandLink href="/" className="mb-4" />
            <p className="marketing-copy max-w-sm text-sm">
              Plataforma de Português e Redação para o ENEM: rotina guiada, correção com IA e prática curta todos os dias.
            </p>
          </div>
          <div className="grid gap-3 text-sm font-semibold text-[hsl(var(--neutral-600))] sm:grid-cols-2">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="font-medium transition-colors hover:text-primary">
                {link.label}
              </Link>
            ))}
            <Link href="/login" className="font-medium transition-colors hover:text-primary">
              Entrar
            </Link>
            <Link href="/dashboard" className="font-medium transition-colors hover:text-primary">
              Painel
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
