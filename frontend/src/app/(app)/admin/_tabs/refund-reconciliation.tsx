"use client";

import { useState } from "react";
import { RotateCcw, SearchCheck } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { formatBRLCents } from "@/lib/format";
import { adminSubscriptionApi } from "@/services/api";
import type { AdminSubscriber, ReconciliationIssue } from "@/types/api";

const ISSUE_LABEL: Record<ReconciliationIssue["kind"], string> = {
  active_without_payment: "Ativa sem pagamento",
  remote_without_local: "No Mercado Pago, sem registro",
  status_mismatch: "Status divergente",
};

export function RefundButton({ subscriber, onRefunded }: { subscriber: AdminSubscriber; onRefunded: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setSaving(true);
    setError(null);
    try {
      const refund = await adminSubscriptionApi.refund(subscriber.user_id);
      toast.success(`Reembolso de ${formatBRLCents(refund.amount_cents)} feito. Acesso revogado.`);
      setOpen(false);
      onRefunded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível reembolsar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setOpen(true)}>
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Reembolsar
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Reembolsar última cobrança" icon={RotateCcw} size="sm">
        <p className="text-sm text-muted-foreground">
          Devolve a última cobrança de <strong>{subscriber.name}</strong> pelo Mercado Pago (só vale dentro do prazo de 7 dias),
          cancela a assinatura e revoga o acesso na hora. A ação fica registrada com seu usuário.
        </p>
        {error ? <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" disabled={saving} onClick={confirm}>
            {saving ? "Reembolsando..." : "Confirmar reembolso"}
          </Button>
        </div>
      </Modal>
    </>
  );
}

export function ReconciliationSection() {
  const [issues, setIssues] = useState<ReconciliationIssue[] | null>(null);
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    try {
      setIssues(await adminSubscriptionApi.reconciliation());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível rodar a conciliação.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="rounded-card border border-border bg-card p-4" data-testid="reconciliation">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">Conciliação Mercado Pago × banco</h3>
          <p className="text-xs text-muted-foreground">Aponta assinaturas ativas sem cobrança aprovada e assinaturas do Mercado Pago sem registro ou com situação diferente.</p>
        </div>
        <Button size="sm" disabled={running} onClick={run}>
          <SearchCheck className="h-4 w-4" aria-hidden="true" />
          {running ? "Conferindo..." : "Rodar conciliação"}
        </Button>
      </div>
      {issues === null ? null : issues.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nenhuma divergência encontrada.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border/70 text-sm">
          {issues.map((issue, index) => (
            <li key={`${issue.mp_preapproval_id}-${index}`} className="py-2">
              <Badge variant="destructive">{ISSUE_LABEL[issue.kind]}</Badge>
              <p className="mt-1">{issue.detail}</p>
              <p className="text-xs text-muted-foreground">
                {issue.email ?? "sem e-mail"} · {issue.mp_preapproval_id ?? "sem id"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
