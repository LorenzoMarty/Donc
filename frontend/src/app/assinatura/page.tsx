"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

import { BrandLink } from "@/components/shared/brand-mark";
import { MotionShell } from "@/components/shared/motion-shell";
import { useAuth } from "@/providers/app-providers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiClientError, authApi, subscriptionApi, type Subscription, type SubscriptionCycle } from "@/services/api";
import { cn } from "@/utils";

// Precos de referencia — espelham subscription_price_monthly_cents/subscription_price_annual_cents
// em backend/src/config/settings.py. Acesso 100% pago, sem trial (spec sistema-planos-mercadopago).
const PLANS: { cycle: SubscriptionCycle; label: string; price: string; note: string }[] = [
  { cycle: "monthly", label: "Mensal", price: "R$ 59", note: "cobrado todo mês" },
  { cycle: "annual", label: "Anual", price: "R$ 588", note: "equivale a R$ 49/mês" },
];

export default function AssinaturaPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [cycle, setCycle] = useState<SubscriptionCycle>("monthly");
  const [couponCode, setCouponCode] = useState("");
  const [error, setError] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [sessionSyncFailed, setSessionSyncFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    subscriptionApi
      .me()
      .then(async (current) => {
        setSubscription(current);
        if (current && (current.status === "active" || current.status === "grace")) {
          try {
            // Reemite o token antes de sair — sem isso a claim `sa` velha (ainda "false") faz
            // o proxy.ts barrar /dashboard e mandar de volta pra cá. Se falhar, NÃO navega —
            // fazer isso mesmo assim gera loop de reload infinito (proxy bloqueia -> volta pra
            // cá -> tenta de novo).
            await authApi.refreshSession();
            window.location.replace("/dashboard");
          } catch {
            setSessionSyncFailed(true);
          }
        }
      })
      .catch(() => setSubscription(null))
      .finally(() => setLoading(false));
  }, [user]);

  async function onCheckout() {
    setCheckoutLoading(true);
    setError("");
    try {
      const result = await subscriptionApi.checkout(cycle, couponCode.trim() || undefined);
      window.location.href = result.checkout_url;
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Falha ao iniciar o checkout.");
      setCheckoutLoading(false);
    }
  }

  if (authLoading || loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </main>
    );
  }

  if (sessionSyncFailed) {
    return (
      <main className="soft-grid grid min-h-screen place-items-center bg-background px-4 py-8 xs:px-6 xs:py-10">
        <MotionShell className="w-full max-w-md">
          <Card className="p-6 text-center">
            <h1 className="text-xl font-semibold">Pagamento confirmado</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Não conseguimos atualizar sua sessão automaticamente. Saia e entre novamente para acessar a plataforma.
            </p>
            <Button className="mt-5 w-full" onClick={logout}>
              Sair e entrar novamente
            </Button>
          </Card>
        </MotionShell>
      </main>
    );
  }

  return (
    <main className="soft-grid grid min-h-screen place-items-center bg-background px-4 py-8 xs:px-6 xs:py-10">
      <MotionShell className="w-full max-w-lg">
        <div className="mb-8 space-y-3">
          <BrandLink href="/" />
          <h1 className="text-3xl font-semibold tracking-tight">Escolha seu plano</h1>
          <p className="text-sm text-muted-foreground">
            {subscription?.status === "suspended"
              ? "Sua assinatura foi suspensa por falta de pagamento. Assine novamente para voltar a treinar."
              : subscription?.status === "canceled"
                ? "Sua assinatura foi cancelada. Assine novamente quando quiser voltar."
                : "A plataforma é 100% assinatura — escolha o ciclo e conclua o pagamento pra liberar sua conta."}
          </p>
        </div>

        <Card className="p-4 xs:p-6">
          <div className="grid gap-3 xs:grid-cols-2">
            {PLANS.map((plan) => (
              <button
                key={plan.cycle}
                type="button"
                onClick={() => setCycle(plan.cycle)}
                className={cn(
                  "min-h-11 rounded-[14px] border p-4 text-left transition-colors",
                  cycle === plan.cycle ? "border-primary bg-primary/10 ring-1 ring-primary/20" : "border-border hover:bg-muted/50",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{plan.label}</span>
                  {cycle === plan.cycle ? <Check className="h-4 w-4 text-primary" aria-hidden="true" /> : null}
                </div>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{plan.price}</p>
                <p className="text-xs text-muted-foreground">{plan.note}</p>
              </button>
            ))}
          </div>

          <div className="mt-5">
            <Input
              placeholder="Cupom de desconto (opcional)"
              value={couponCode}
              onChange={(event) => setCouponCode(event.target.value)}
            />
          </div>

          {error && <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

          <Button className="mt-5 w-full" disabled={checkoutLoading} onClick={onCheckout}>
            {checkoutLoading ? "Redirecionando..." : "Ir para pagamento"}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">Pagamento processado pelo Mercado Pago.</p>
        </Card>
      </MotionShell>
    </main>
  );
}
