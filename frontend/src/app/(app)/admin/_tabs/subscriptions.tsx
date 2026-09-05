"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Tag, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { LoadingCard } from "@/components/shared/loading-card";
import { formatBRLCents } from "@/lib/format";
import { adminSubscriptionApi } from "@/services/api";
import type { AdminSubscriber, Coupon } from "@/types/api";

const STATUS_LABEL: Record<AdminSubscriber["status"], { label: string; variant: "default" | "outline" | "destructive" | "success" }> = {
  pending: { label: "Aguardando pagamento", variant: "outline" },
  active: { label: "Ativa", variant: "success" },
  grace: { label: "Pagamento pendente", variant: "default" },
  suspended: { label: "Suspensa", variant: "destructive" },
  canceled: { label: "Cancelada", variant: "destructive" },
};

const CYCLE_LABEL: Record<AdminSubscriber["cycle"], string> = { monthly: "Mensal", annual: "Anual" };

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR");
}

export function SubscriptionsTab() {
  const [subscribers, setSubscribers] = useState<AdminSubscriber[] | null>(null);
  const [mrrCents, setMrrCents] = useState(0);
  const [total, setTotal] = useState(0);
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [creatingCoupon, setCreatingCoupon] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  function loadSubscribers() {
    adminSubscriptionApi
      .subscribers()
      .then((data) => {
        setSubscribers(data.items);
        setMrrCents(data.mrr_cents);
        setTotal(data.total);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Não foi possível carregar os assinantes."));
  }

  function loadCoupons() {
    adminSubscriptionApi
      .coupons()
      .then((data) => setCoupons(data.items))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Não foi possível carregar os cupons."));
  }

  useEffect(() => {
    loadSubscribers();
    loadCoupons();
  }, []);

  async function onDeactivateCoupon(coupon: Coupon) {
    try {
      await adminSubscriptionApi.deactivateCoupon(coupon.id);
      toast.success("Cupom desativado.");
      loadCoupons();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível desativar o cupom.");
    }
  }

  if (!subscribers || !coupons) {
    return <LoadingCard />;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-card border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Receita recorrente (MRR)</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{formatBRLCents(mrrCents)}</p>
        </div>
        <div className="rounded-card border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assinantes</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{total}</p>
        </div>
      </div>

      <section className="rounded-card border border-border bg-card p-4">
        <h3 className="font-semibold">Assinantes</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="pb-2">Aluno</th>
                <th className="pb-2">Ciclo</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Valor</th>
                <th className="pb-2">Próximo período / cancelamento</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((row) => {
                const status = STATUS_LABEL[row.status];
                return (
                  <tr key={row.user_id} className="border-t border-border/70">
                    <td className="py-2">
                      <p className="font-medium">{row.name}</p>
                      <p className="text-xs text-muted-foreground">{row.email}</p>
                    </td>
                    <td className="py-2">{CYCLE_LABEL[row.cycle]}</td>
                    <td className="py-2">
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </td>
                    <td className="py-2 tabular-nums">{formatBRLCents(row.price_charged_cents)}</td>
                    <td className="py-2 text-muted-foreground">
                      {row.canceled_at ? `Cancela em ${formatDate(row.current_period_end)}` : formatDate(row.current_period_end)}
                    </td>
                  </tr>
                );
              })}
              {subscribers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-muted-foreground">
                    Nenhum assinante ainda.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-card border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Cupons de desconto</h3>
          <Button size="sm" onClick={() => setCreatingCoupon(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Novo cupom
          </Button>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="pb-2">Código</th>
                <th className="pb-2">Desconto</th>
                <th className="pb-2">Uso</th>
                <th className="pb-2">Validade</th>
                <th className="pb-2">Status</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon.id} className="border-t border-border/70">
                  <td className="py-2 font-mono font-medium">{coupon.code}</td>
                  <td className="py-2">
                    {coupon.discount_type === "percent" ? `${coupon.discount_value}%` : formatBRLCents(coupon.discount_value)}
                  </td>
                  <td className="py-2 tabular-nums">
                    {coupon.used_count}
                    {coupon.max_uses ? ` / ${coupon.max_uses}` : ""}
                  </td>
                  <td className="py-2 text-muted-foreground">{coupon.valid_until ? `até ${formatDate(coupon.valid_until)}` : "sem prazo"}</td>
                  <td className="py-2">
                    <Badge variant={coupon.active ? "success" : "outline"}>{coupon.active ? "Ativo" : "Inativo"}</Badge>
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditingCoupon(coupon)}>
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        Editar
                      </Button>
                      {coupon.active ? (
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onDeactivateCoupon(coupon)}>
                          <XCircle className="h-4 w-4" aria-hidden="true" />
                          Desativar
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-muted-foreground">
                    Nenhum cupom criado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <CreateCouponModal
        open={creatingCoupon}
        onClose={() => setCreatingCoupon(false)}
        onCreated={() => {
          setCreatingCoupon(false);
          loadCoupons();
        }}
      />
      <EditCouponModal
        coupon={editingCoupon}
        onClose={() => setEditingCoupon(null)}
        onSaved={() => {
          setEditingCoupon(null);
          loadCoupons();
        }}
      />
    </div>
  );
}

function EditCouponModal({ coupon, onClose, onSaved }: { coupon: Coupon | null; onClose: () => void; onSaved: () => void }) {
  return (
    <Modal open={coupon !== null} onClose={onClose} title={`Editar ${coupon?.code ?? ""}`} icon={Pencil} size="sm">
      {coupon ? <EditCouponForm key={coupon.id} coupon={coupon} onClose={onClose} onSaved={onSaved} /> : null}
    </Modal>
  );
}

function EditCouponForm({ coupon, onClose, onSaved }: { coupon: Coupon; onClose: () => void; onSaved: () => void }) {
  // Estado inicializado direto do prop (nao via useEffect+setState) — `key={coupon.id}` no
  // componente pai forca remount quando o cupom editado muda, entao isto so roda uma vez por
  // cupom aberto.
  const [discountValue, setDiscountValue] = useState(() =>
    coupon.discount_type === "percent" ? String(coupon.discount_value) : String(coupon.discount_value / 100),
  );
  const [maxUses, setMaxUses] = useState(() => (coupon.max_uses ? String(coupon.max_uses) : ""));
  const [validUntil, setValidUntil] = useState(() => (coupon.valid_until ? coupon.valid_until.slice(0, 10) : ""));
  const [active, setActive] = useState(coupon.active);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const value = Number(discountValue);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Informe um valor de desconto válido.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await adminSubscriptionApi.updateCoupon(coupon.id, {
        discount_value: coupon.discount_type === "percent" ? Math.round(value) : Math.round(value * 100),
        max_uses: maxUses ? Number(maxUses) : null,
        valid_until: validUntil ? new Date(validUntil).toISOString() : null,
        active,
      });
      toast.success("Cupom atualizado.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o cupom.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="grid gap-3 text-foreground">
        <div className="grid grid-cols-2 gap-3">
          <Field label={coupon.discount_type === "percent" ? "% de desconto" : "R$ de desconto"}>
            <Input type="number" min={0} value={discountValue} onChange={(event) => setDiscountValue(event.target.value)} />
          </Field>
          <Field label="Limite de uso">
            <Input type="number" min={1} value={maxUses} onChange={(event) => setMaxUses(event.target.value)} placeholder="sem limite" />
          </Field>
        </div>
        <Field label="Válido até">
          <Input type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} className="h-4 w-4" />
          Cupom ativo
        </label>
      </div>
      {error && <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={submit} disabled={saving}>
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </>
  );
}

function CreateCouponModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setCode("");
    setDiscountType("percent");
    setDiscountValue("");
    setMaxUses("");
    setValidUntil("");
    setError(null);
  }

  async function submit() {
    const value = Number(discountValue);
    if (!code.trim() || !Number.isFinite(value) || value <= 0) {
      setError("Informe código e um valor de desconto válido.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await adminSubscriptionApi.createCoupon({
        code: code.trim(),
        discount_type: discountType,
        // Percentual: numero direto (10 = 10%). Fixo: valor em reais digitado -> centavos.
        discount_value: discountType === "percent" ? Math.round(value) : Math.round(value * 100),
        max_uses: maxUses ? Number(maxUses) : null,
        valid_until: validUntil ? new Date(validUntil).toISOString() : null,
      });
      toast.success("Cupom criado.");
      reset();
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar o cupom.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Novo cupom"
      icon={Tag}
      size="sm"
    >
      <div className="grid gap-3 text-foreground">
        <Field label="Código">
          <Input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="PROMO10" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo de desconto">
            <Select value={discountType} onChange={(event) => setDiscountType(event.target.value as "percent" | "fixed")}>
              <option value="percent">Percentual (%)</option>
              <option value="fixed">Valor fixo (R$)</option>
            </Select>
          </Field>
          <Field label={discountType === "percent" ? "% de desconto" : "R$ de desconto"}>
            <Input type="number" min={0} value={discountValue} onChange={(event) => setDiscountValue(event.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Limite de uso (opcional)">
            <Input type="number" min={1} value={maxUses} onChange={(event) => setMaxUses(event.target.value)} />
          </Field>
          <Field label="Válido até (opcional)">
            <Input type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} />
          </Field>
        </div>
      </div>
      {error && <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={submit} disabled={saving}>
          {saving ? "Criando..." : "Criar cupom"}
        </Button>
      </div>
    </Modal>
  );
}
