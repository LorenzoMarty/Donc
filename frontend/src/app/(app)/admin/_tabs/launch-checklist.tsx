"use client";

import { useState } from "react";
import { ClipboardCheck } from "lucide-react";

const STORAGE_KEY = "donc.admin.launch-checklist.v1";

type ChecklistItem = { id: string; label: string; hint: string };

// Lista fixa no código; o "feito" fica salvo neste navegador (não é compartilhado entre admins).
export const LAUNCH_CHECKLIST: { group: string; items: ChecklistItem[] }[] = [
  {
    group: "Infraestrutura",
    items: [
      { id: "domain-https", label: "Domínio com HTTPS no ar", hint: "Deploy em VPS atrás do Caddy (issue #28)." },
      { id: "env-prod", label: "Variáveis de produção definidas", hint: "ENVIRONMENT=production, JWT_SECRET_KEY, SEED_ADMIN_PASSWORD, OPENAI_API_KEY, RESEND_API_KEY, MERCADOPAGO_*." },
      { id: "backup-db", label: "Backup diário do banco com restore testado", hint: "Issue #28." },
      { id: "backup-files", label: "Backup dos arquivos (PDFs e uploads)", hint: "Issue #45." },
      { id: "monitoring", label: "Monitoramento e alertas ativos", hint: "Sentry, uptime check e alerta de webhook (issue #30)." },
    ],
  },
  {
    group: "Pagamento",
    items: [
      { id: "payment-e2e", label: "Pagamento validado ponta a ponta em produção", hint: "Cadastro, checkout, webhook, renovação e cancelamento (issue #29)." },
      { id: "refund-flow", label: "Reembolso e conciliação testados com o Mercado Pago", hint: "Aba Assinaturas (issue #44)." },
    ],
  },
  {
    group: "Produto e conteúdo",
    items: [
      { id: "quota", label: "Cota mensal de correções definida", hint: "ESSAY_MONTHLY_QUOTA: custo médio por correção × cota < ~25% do plano (issue #31)." },
      { id: "lessons", label: "Aulas publicadas suficientes para o lançamento", hint: "Publicar pelo painel de aulas." },
      { id: "faq", label: "FAQ do suporte revisada e aprovada", hint: "Textos em features/support/faq-data.ts (issue #40)." },
      { id: "legal", label: "Termos, privacidade e reembolso revisados", hint: "Páginas /termos, /privacidade e /cancelamento." },
      { id: "runbook", label: "Runbook de incidentes escrito", hint: "Issue #50." },
    ],
  },
];

function readDone(): Record<string, boolean> {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, boolean>;
  } catch {
    return {};
  }
}

export function LaunchChecklist() {
  // A aba só monta no cliente, depois de carregar o painel: ler o storage no init é seguro.
  const [done, setDone] = useState<Record<string, boolean>>(() => readDone());
  const all = LAUNCH_CHECKLIST.flatMap((group) => group.items);
  const doneCount = all.filter((item) => done[item.id]).length;

  function toggle(id: string) {
    const next = { ...done, [id]: !done[id] };
    setDone(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // sem storage: o marcado vale só até recarregar
    }
  }

  return (
    <section className="rounded-card border border-border bg-card p-4" data-testid="launch-checklist">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-semibold">
          <ClipboardCheck className="h-4 w-4 text-primary" aria-hidden="true" />
          Checklist de lançamento
        </h3>
        <span className="text-[13px] text-muted-foreground">
          {doneCount} de {all.length} itens
        </span>
      </div>
      <div className="mt-3 space-y-4">
        {LAUNCH_CHECKLIST.map((group) => (
          <div key={group.group}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.group}</p>
            <ul className="mt-1 divide-y divide-border/60">
              {group.items.map((item) => (
                <li key={item.id}>
                  <label className="flex min-h-[44px] cursor-pointer items-start gap-3 py-2">
                    <input type="checkbox" checked={Boolean(done[item.id])} onChange={() => toggle(item.id)} className="mt-1 h-4 w-4" />
                    <span className="min-w-0">
                      <span className={done[item.id] ? "block text-sm line-through opacity-70" : "block text-sm font-medium"}>{item.label}</span>
                      <span className="block text-xs text-muted-foreground">{item.hint}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
