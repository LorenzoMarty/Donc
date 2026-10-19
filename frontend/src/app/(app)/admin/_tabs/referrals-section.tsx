"use client";

import { useEffect, useState } from "react";
import { Gift } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminSubscriptionApi } from "@/services/api";
import type { AdminReferrals } from "@/types/api";

export function ReferralsSection() {
  const [data, setData] = useState<AdminReferrals | null>(null);

  function load() {
    adminSubscriptionApi
      .referrals()
      .then(setData)
      .catch((err) => toast.error(err instanceof Error ? err.message : "Não foi possível carregar as indicações."));
  }

  useEffect(() => {
    // setTimeout(0): evita setState síncrono dentro do efeito (mesmo padrão do perfil).
    const id = window.setTimeout(load, 0);
    return () => window.clearTimeout(id);
  }, []);

  async function apply(id: number) {
    try {
      await adminSubscriptionApi.applyReferralReward(id);
      toast.success("Crédito marcado como aplicado.");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível atualizar a indicação.");
    }
  }

  if (!data) return null;

  return (
    <section className="rounded-card border border-border bg-card p-4" data-testid="referrals-admin">
      <h3 className="flex items-center gap-2 font-semibold">
        <Gift className="h-4 w-4 text-primary" aria-hidden="true" />
        Indicações
      </h3>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
        <Stat label="Total" value={data.total} />
        <Stat label="Aguardando pagamento" value={data.pending} />
        <Stat label="Confirmadas" value={data.rewarded} />
        <Stat label="Créditos a aplicar" value={data.credits_open} />
      </dl>
      {data.top_referrers.length ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Mais indicam: {data.top_referrers.map((item) => `${item.name || item.email} (${item.rewarded})`).join(", ")}
        </p>
      ) : null}
      {data.items.length ? (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="pb-2">Quem indicou</th>
                <th className="pb-2">Indicado</th>
                <th className="pb-2">Situação</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id} className="border-t border-border/70">
                  <td className="py-2">{item.referrer_email}</td>
                  <td className="py-2">{item.referred_email}</td>
                  <td className="py-2">
                    <Badge variant={item.status === "rewarded" ? "success" : "outline"}>{item.status === "rewarded" ? "Confirmada" : "Aguardando pagamento"}</Badge>
                  </td>
                  <td className="py-2 text-right">
                    {item.status === "rewarded" && !item.reward_applied ? (
                      <Button size="sm" variant="outline" onClick={() => apply(item.id)}>
                        Marcar crédito aplicado
                      </Button>
                    ) : item.reward_applied ? (
                      <span className="text-xs text-muted-foreground">Crédito aplicado</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Nenhuma indicação ainda.</p>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
