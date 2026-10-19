"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Gift } from "lucide-react";
import { toast } from "sonner";

import { Surface } from "@/components/shared/premium-ui";
import { Button } from "@/components/ui/button";
import { subscriptionApi, type ReferralSummary } from "@/services/api";

export function ReferralCard() {
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    subscriptionApi
      .referral()
      .then((data) => active && setSummary(data))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  if (!summary) return null;

  const link = `${window.location.origin}/cadastro?ref=${summary.code}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar. Copie o link manualmente.");
    }
  }

  return (
    <Surface>
      <div data-testid="referral-card">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-control bg-primary/12 text-primary">
            <Gift className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="section-title font-semibold">Indique um amigo</h2>
            <p className="text-sm text-muted-foreground">
              Seu amigo ganha {summary.discount_percent}% de desconto e você ganha 1 mês grátis quando ele assinar.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <code className="rounded-control bg-muted px-3 py-2.5 font-mono text-sm font-semibold" data-testid="referral-code">
            {summary.code}
          </code>
          <Button type="button" variant="secondary" className="min-h-[44px]" onClick={copyLink}>
            {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            {copied ? "Link copiado" : "Copiar link"}
          </Button>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {summary.rewarded_count} {summary.rewarded_count === 1 ? "indicação confirmada" : "indicações confirmadas"} · {summary.pending_count} aguardando o
          primeiro pagamento · {summary.credits_available} {summary.credits_available === 1 ? "mês grátis a receber" : "meses grátis a receber"}
        </p>
      </div>
    </Surface>
  );
}
