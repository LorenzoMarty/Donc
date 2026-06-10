"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { formatBRLCents, formatTokens, formatUSDMicros } from "@/lib/format";
import type { AgentStats, AITelemetry, ModelStats, WorkflowStats } from "@/types/api";

export function AITelemetryTab({
  telemetry,
  initialError,
  onPeriodChange,
}: {
  telemetry: AITelemetry;
  initialError?: string;
  onPeriodChange: (days: number) => Promise<void>;
}) {
  const [period, setPeriod] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError ?? "");

  async function changePeriod(days: number) {
    setPeriod(days);
    setLoading(true);
    setError("");
    try {
      await onPeriodChange(days);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os custos de IA.");
    } finally {
      setLoading(false);
    }
  }

  const errorRate = telemetry.total_calls ? Math.round((telemetry.error_calls / telemetry.total_calls) * 100) : 0;
  const avgCostBrlCents = telemetry.total_calls ? Math.round(telemetry.cost_brl_cents / telemetry.total_calls) : 0;
  const rate = telemetry.usd_brl_rate || 0;

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
      ) : null}

      {/* Header: período + cotação */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[7, 14, 30, 60, 90].map((d) => (
            <button
              key={d}
              type="button"
              disabled={loading}
              onClick={() => changePeriod(d)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${period === d ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}
            >
              {d} dias
            </button>
          ))}
        </div>
        {rate > 0 ? (
          <p className="text-xs text-muted-foreground">
            Cotação <span className="font-medium text-foreground">US$ 1 = R$ {rate.toFixed(2)}</span>
            <span className="ml-1 opacity-70">({telemetry.rate_source || "—"})</span>
          </p>
        ) : null}
      </div>

      {/* Cards de topo — R$ em destaque, US$ pequeno */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <BigCostCard label="Custo total no período" brlCents={telemetry.cost_brl_cents} usdMicros={telemetry.cost_usd_micros} highlight />
        <BigCostCard label="Custo médio por chamada" brlCents={avgCostBrlCents} />
        <SmallCard label="Chamadas" value={telemetry.total_calls.toLocaleString("pt-BR")} hint={`${formatTokens(telemetry.total_tokens)} tokens`} />
        <SmallCard label="Taxa de erro" value={`${errorRate}%`} error={errorRate > 5} hint={`${telemetry.error_calls} com erro`} />
      </div>

      {!error && !telemetry.has_data ? (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          Ainda não há chamadas de IA registradas neste período. Quando alunos ou administradores usarem recursos com IA, os custos aparecerão aqui.
        </div>
      ) : null}

      {/* Gasto por dia (R$) */}
      {telemetry.daily.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <h2 className="mb-4 font-semibold">Gasto por dia (R$)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={telemetry.daily} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `R$${(v / 100).toFixed(0)}`} width={52} />
              <Tooltip
                formatter={(v: number) => [formatBRLCents(v), "Custo"]}
                labelFormatter={(l: string) => `Data: ${l}`}
              />
              <Bar dataKey="cost_brl_cents" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Por workflow — quanto cada fluxo gasta */}
      {telemetry.workflows.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="border-b p-4">
            <h2 className="font-semibold">Por workflow</h2>
            <p className="text-xs text-muted-foreground">Quanto cada fluxo de IA gasta no período</p>
          </div>
          <div className="mobile-scroll overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left">
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Workflow</th>
                  <th className="px-4 py-3 font-medium tabular-nums">Chamadas</th>
                  <th className="px-4 py-3 font-medium tabular-nums">Tokens</th>
                  <th className="px-4 py-3 font-medium tabular-nums">Custo médio</th>
                  <th className="px-4 py-3 font-medium tabular-nums">Custo total</th>
                </tr>
              </thead>
              <tbody>
                {telemetry.workflows.map((w: WorkflowStats) => (
                  <tr key={w.workflow} className="border-b last:border-b-0 hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium">{w.workflow}</td>
                    <td className="px-4 py-3 tabular-nums">{w.total_calls}</td>
                    <td className="px-4 py-3 tabular-nums">{formatTokens(w.total_tokens)}</td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{formatBRLCents(w.avg_cost_brl_cents)}</td>
                    <td className="px-4 py-3 tabular-nums font-semibold">
                      {formatBRLCents(w.cost_brl_cents)}
                      <span className="ml-1 text-[10px] font-normal text-muted-foreground">{formatUSDMicros(w.cost_usd_micros)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Por modelo — qual IA gasta mais / é mais chamada */}
      {telemetry.models.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="border-b p-4">
            <h2 className="font-semibold">Por modelo de IA</h2>
            <p className="text-xs text-muted-foreground">Qual IA gasta mais e qual é mais chamada</p>
          </div>
          <div className="mobile-scroll overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-left">
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Modelo</th>
                  <th className="px-4 py-3 font-medium tabular-nums">Chamadas</th>
                  <th className="px-4 py-3 font-medium tabular-nums">Tokens</th>
                  <th className="px-4 py-3 font-medium tabular-nums">Custo</th>
                </tr>
              </thead>
              <tbody>
                {telemetry.models.map((m: ModelStats) => (
                  <tr key={m.model} className="border-b last:border-b-0 hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium font-mono text-xs">{m.model}</td>
                    <td className="px-4 py-3 tabular-nums">{m.total_calls}</td>
                    <td className="px-4 py-3 tabular-nums">{formatTokens(m.total_tokens)}</td>
                    <td className="px-4 py-3 tabular-nums font-semibold">
                      {formatBRLCents(m.cost_brl_cents)}
                      <span className="ml-1 text-[10px] font-normal text-muted-foreground">{formatUSDMicros(m.cost_usd_micros)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Por agente */}
      <div className="rounded-lg border bg-card">
        <div className="border-b p-4">
          <h2 className="font-semibold">Por agente</h2>
        </div>
        <div className="mobile-scroll overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="text-left">
              <tr className="border-b text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Agente</th>
                <th className="px-4 py-3 font-medium">Workflow</th>
                <th className="px-4 py-3 font-medium tabular-nums">Chamadas</th>
                <th className="px-4 py-3 font-medium tabular-nums">Erros</th>
                <th className="px-4 py-3 font-medium tabular-nums">Tokens</th>
                <th className="px-4 py-3 font-medium tabular-nums">Latência avg</th>
                <th className="px-4 py-3 font-medium tabular-nums">Custo</th>
              </tr>
            </thead>
            <tbody>
              {telemetry.agents.map((agent: AgentStats) => (
                <tr key={`${agent.workflow}:${agent.agent}`} className="border-b last:border-b-0 hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{agent.agent}</td>
                  <td className="px-4 py-3 text-muted-foreground">{agent.workflow}</td>
                  <td className="px-4 py-3 tabular-nums">{agent.total_calls}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {agent.error_calls > 0 ? (
                      <Badge variant="destructive" className="text-xs">{agent.error_calls}</Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{formatTokens(agent.total_tokens)}</td>
                  <td className="px-4 py-3 tabular-nums">{agent.avg_latency_ms.toLocaleString("pt-BR")} ms</td>
                  <td className="px-4 py-3 tabular-nums font-medium">{formatBRLCents(agent.cost_brl_cents)}</td>
                </tr>
              ))}
              {telemetry.agents.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Sem dados no período.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top consumidores */}
      {telemetry.top_users.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="border-b p-4">
            <h2 className="font-semibold">Maiores consumidores de IA</h2>
          </div>
          <div className="divide-y">
            {telemetry.top_users.map((u, i) => (
              <div key={u.user_id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 text-xs text-muted-foreground tabular-nums">#{i + 1}</span>
                  <span className="text-sm">{u.label}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="tabular-nums text-muted-foreground">{formatTokens(u.total_tokens)} tokens</span>
                  <span className="tabular-nums font-semibold">{formatBRLCents(u.cost_brl_cents)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BigCostCard({ label, brlCents, usdMicros, highlight }: { label: string; brlCents: number; usdMicros?: number; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? "bg-primary/5 border-primary/30" : "bg-card"}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold">{formatBRLCents(brlCents)}</p>
      {usdMicros !== undefined ? <p className="text-xs text-muted-foreground">{formatUSDMicros(usdMicros)}</p> : null}
    </div>
  );
}

function SmallCard({ label, value, hint, error }: { label: string; value: string; hint?: string; error?: boolean }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${error ? "text-destructive" : ""}`}>{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
