import { MarketingShell } from "@/components/sections/marketing-shell";

// Mantida em sincronia com `legal_terms_version` do backend (settings.py). Subir os dois juntos ao
// revisar o texto — o backend grava a versão aceita em User.terms_version.
export const LEGAL_VERSION = "12/10/2026";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <MarketingShell>
      <main className="marketing-container max-w-3xl py-10">
        <p className="marketing-kicker">Legal</p>
        <h1 className="font-display mt-3 text-4xl font-semibold leading-tight tracking-normal">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Versão de {LEGAL_VERSION}</p>
        <p role="note" className="mt-5 rounded-md border border-border bg-muted px-4 py-3 text-sm">
          Texto em revisão jurídica. Pode mudar antes do lançamento.
        </p>
        <div className="mt-8 space-y-6 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:leading-relaxed [&_p]:text-[hsl(var(--neutral-600))] [&_ul]:space-y-1">
          {children}
        </div>
      </main>
    </MarketingShell>
  );
}
