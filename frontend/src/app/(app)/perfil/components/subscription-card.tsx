"use client";

import { useEffect, useState } from "react";
import { CreditCard, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Surface } from "@/components/shared/premium-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ApiClientError, subscriptionApi, type Subscription, type SubscriptionCycle, type SubscriptionPayment } from "@/services/api";
import { cn } from "@/utils";

const STATUS_LABEL: Record<Subscription["status"], { label: string; tone: string }> = {
  pending: { label: "Aguardando pagamento", tone: "bg-muted text-muted-foreground" },
  active: { label: "Ativa", tone: "bg-primary/12 text-primary" },
  grace: { label: "Pagamento pendente", tone: "bg-streak-tint text-streak" },
  suspended: { label: "Suspensa", tone: "bg-destructive/10 text-destructive" },
  canceled: { label: "Cancelada", tone: "bg-destructive/10 text-destructive" },
};

// Gestão de cartão/assinatura na conta do Mercado Pago do próprio aluno.
const MP_MANAGE_URL = "https://www.mercadopago.com.br/subscriptions";

const PAYMENT_LABEL: Record<SubscriptionPayment["status"], { label: string; tone: string }> = {
  paid: { label: "Pago", tone: "bg-primary/12 text-primary" },
  failed: { label: "Recusado", tone: "bg-destructive/10 text-destructive" },
  pending: { label: "Agendado", tone: "bg-muted text-muted-foreground" },
};

const CYCLE_LABEL: Record<SubscriptionCycle, string> = { monthly: "Mensal", annual: "Anual" };

export function SubscriptionCard() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [changingPlan, setChangingPlan] = useState(false);
  const [canceling, setCanceling] = useState(false);

  function load() {
    setLoading(true);
    subscriptionApi
      .me()
      .then(setSubscription)
      .catch(() => setSubscription(null))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    // setTimeout(0): evita disparar setState sincronamente dentro do corpo do efeito (mesmo
    // padrao de providers/app-providers.tsx AuthProvider.refresh).
    const id = window.setTimeout(load, 0);
    return () => window.clearTimeout(id);
  }, []);

  if (loading) {
    return <Surface className="animate-pulse text-transparent">Carregando assinatura...</Surface>;
  }

  if (!subscription) {
    return null;
  }

  const status = STATUS_LABEL[subscription.status];
  const otherCycle: SubscriptionCycle = subscription.cycle === "monthly" ? "annual" : "monthly";
  const priceLabel = (subscription.price_charged_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <Surface>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-control bg-primary/12 text-primary">
            <CreditCard className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Assinatura</p>
            <p className="font-semibold">
              {CYCLE_LABEL[subscription.cycle]} · {priceLabel}
            </p>
          </div>
        </div>
        <Badge className={cn("shrink-0", status.tone)}>{status.label}</Badge>
      </div>

      {subscription.canceled_at ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Cancelamento agendado — acesso continua até {formatDate(subscription.current_period_end)}.
        </p>
      ) : subscription.status === "grace" ? (
        <p className="mt-3 text-sm text-muted-foreground">
          O último pagamento falhou. Atualize a forma de pagamento até {formatDate(subscription.grace_until)} para não perder o acesso.
        </p>
      ) : subscription.status === "suspended" ? (
        <p className="mt-3 text-sm text-muted-foreground">Sem pagamento confirmado, o acesso está suspenso. Regularize ou assine de novo.</p>
      ) : subscription.status === "active" ? (
        <p className="mt-3 text-sm text-muted-foreground" data-testid="next-charge">
          Próxima cobrança em {formatDate(subscription.current_period_end)} · {priceLabel}
          {subscription.coupon_code ? ` · cupom ${subscription.coupon_code}` : ""}
        </p>
      ) : null}

      {subscription.status === "grace" || subscription.status === "suspended" ? (
        <div className="mt-3">
          <Button asChild size="sm" className="min-h-11">
            <a href={MP_MANAGE_URL} target="_blank" rel="noopener noreferrer">
              <CreditCard className="h-4 w-4" aria-hidden="true" />
              Atualizar forma de pagamento
            </a>
          </Button>
        </div>
      ) : null}

      {subscription.status === "active" && !subscription.canceled_at ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setChangingPlan(true)}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Trocar para {CYCLE_LABEL[otherCycle]}
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setCanceling(true)}>
            <XCircle className="h-4 w-4" aria-hidden="true" />
            Cancelar assinatura
          </Button>
        </div>
      ) : null}

      {subscription.status !== "pending" ? <PaymentHistory /> : null}

      <ChangePlanModal
        open={changingPlan}
        targetCycle={otherCycle}
        onClose={() => setChangingPlan(false)}
        onChanged={() => {
          setChangingPlan(false);
          load();
        }}
      />
      <CancelModal open={canceling} onClose={() => setCanceling(false)} onCanceled={() => { setCanceling(false); load(); }} />
    </Surface>
  );
}

function PaymentHistory() {
  const [payments, setPayments] = useState<SubscriptionPayment[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    subscriptionApi
      .payments()
      .then((items) => active && setPayments(items))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mt-4 border-t border-border/60 pt-3" data-testid="payment-history">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Histórico de cobranças</p>
      {failed ? (
        <p className="mt-2 text-sm text-muted-foreground">Não foi possível carregar o histórico agora. Tente de novo mais tarde.</p>
      ) : payments === null ? (
        <p className="mt-2 text-sm text-muted-foreground">Carregando...</p>
      ) : payments.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Nenhuma cobrança registrada ainda.</p>
      ) : (
        <ul className="mt-2 divide-y divide-border/60">
          {payments.map((payment) => (
            <li key={payment.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span>{formatDate(payment.date)}</span>
              <span className="tabular-nums">{(payment.amount_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              <Badge className={cn("shrink-0", PAYMENT_LABEL[payment.status].tone)}>{PAYMENT_LABEL[payment.status].label}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ChangePlanModal({
  open,
  targetCycle,
  onClose,
  onChanged,
}: {
  open: boolean;
  targetCycle: SubscriptionCycle;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setSaving(true);
    setError(null);
    try {
      await subscriptionApi.changePlan(targetCycle);
      toast.success("Plano alterado.");
      onChanged();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Não foi possível trocar de plano.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Trocar de plano" icon={RefreshCw} size="sm">
      <p className="text-sm text-foreground">
        Trocar para o plano <strong>{CYCLE_LABEL[targetCycle]}</strong>? A próxima cobrança já sai no novo valor e ciclo.
      </p>
      {error && <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={confirm} disabled={saving}>
          {saving ? "Salvando..." : "Confirmar troca"}
        </Button>
      </div>
    </Modal>
  );
}

function CancelModal({ open, onClose, onCanceled }: { open: boolean; onClose: () => void; onCanceled: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setSaving(true);
    setError(null);
    try {
      await subscriptionApi.cancel();
      toast.success("Assinatura cancelada.");
      onCanceled();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Não foi possível cancelar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Cancelar assinatura" icon={XCircle} size="sm">
      <p className="text-sm text-foreground">
        Seu acesso continua até o fim do período já pago. Depois disso a conta fica bloqueada até assinar de novo.
      </p>
      {error && <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Voltar
        </Button>
        <Button variant="destructive" onClick={confirm} disabled={saving}>
          {saving ? "Cancelando..." : "Cancelar assinatura"}
        </Button>
      </div>
    </Modal>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}
