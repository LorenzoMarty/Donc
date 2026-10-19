"use client";

import { useEffect, useState } from "react";
import { Filter } from "lucide-react";
import { toast } from "sonner";

import { adminSubscriptionApi } from "@/services/api";
import type { AdminFunnel } from "@/types/api";

const formatPct = (value: number) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

export function FunnelSection() {
  const [funnel, setFunnel] = useState<AdminFunnel | null>(null);

  useEffect(() => {
    let active = true;
    adminSubscriptionApi
      .funnel(30)
      .then((data) => active && setFunnel(data))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Não foi possível carregar o funil."));
    return () => {
      active = false;
    };
  }, []);

  if (!funnel) return null;

  return (
    <section className="rounded-card border border-border bg-card p-4" data-testid="funnel">
      <h3 className="flex items-center gap-2 font-semibold">
        <Filter className="h-4 w-4 text-primary" aria-hidden="true" />
        Funil e retenção ({funnel.days} dias)
      </h3>
      {funnel.signups === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nenhum cadastro no período.</p>
      ) : (
        <>
          <ol className="mt-3 space-y-2">
            {funnel.steps.map((step) => (
              <li key={step.key}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span>{step.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {step.count} · {formatPct(step.pct)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, step.pct)}%` }} />
                </div>
              </li>
            ))}
          </ol>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tempo até a 1ª atividade</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">
                {funnel.first_action_median_minutes === null ? "—" : `${funnel.first_action_median_minutes.toLocaleString("pt-BR")} min (mediana)`}
              </dd>
              <dd className="text-xs text-muted-foreground">{formatPct(funnel.first_action_within_target_pct)} em até 3 min</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Retorno em D1</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">{formatPct(funnel.retention_d1.rate)}</dd>
              <dd className="text-xs text-muted-foreground">
                {funnel.retention_d1.retained} de {funnel.retention_d1.eligible}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Retorno em D7</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">{formatPct(funnel.retention_d7.rate)}</dd>
              <dd className="text-xs text-muted-foreground">
                {funnel.retention_d7.retained} de {funnel.retention_d7.eligible}
              </dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
}
