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
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[68px] w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 md:px-6">
          <BrandLink href="/" />
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground decoration-primary decoration-2 underline-offset-4 transition-colors hover:text-foreground hover:underline"
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
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.1fr_0.9fr] md:px-6">
          <div>
            <BrandLink href="/" className="mb-4" />
            <p className="max-w-sm text-sm leading-6 text-muted-foreground">
              Plataforma de Português e Redação para o ENEM: rotina guiada, correção com IA e prática curta todos os dias.
            </p>
          </div>
          <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
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
        <div className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground md:px-6">
          Donc ENEM · em pré-lançamento
        </div>
      </footer>
    </div>
  );
}
