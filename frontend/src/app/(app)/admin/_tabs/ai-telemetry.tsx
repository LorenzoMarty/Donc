"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { agentLabel, workflowLabel } from "@/app/(app)/admin/_tabs/ai-labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBRLCents, formatTokens, formatUSDMicros } from "@/lib/format";
import type { AgentStats, AITelemetry, WorkflowStats } from "@/types/api";

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
  const topWorkflows = [...telemetry.workflows].sort((a, b) => b.cost_brl_cents - a.cost_brl_cents).slice(0, 6);
  const maxWorkflowCost = topWorkflows[0]?.cost_brl_cents ?? 0;

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-card border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
      ) : null}

      <div className="rounded-card border border-border/80 bg-card p-4 shadow-soft">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-base font-semibold">Controle de consumo</h2>
            <p className="mt-1 text-sm text-muted-foreground">Acompanhe custo, volume e falhas por período.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[7, 14, 30, 60, 90].map((d) => (
              <Button key={d} type="button" size="sm" variant={period === d ? "default" : "outline"} disabled={loading} onClick={() => changePeriod(d)}>
                {d} dias
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Custo total" value={formatBRLCents(telemetry.cost_brl_cents)} hint={formatUSDMicros(telemetry.cost_usd_micros)} strong />
        <MetricCard label="Custo por chamada" value={formatBRLCents(avgCostBrlCents)} hint={`${telemetry.total_calls.toLocaleString("pt-BR")} chamadas`} />
        <MetricCard label="Tokens" value={formatTokens(telemetry.total_tokens)} hint="Entrada e saída" />
        <MetricCard label="Falhas" value={`${errorRate}%`} hint={`${telemetry.error_calls} chamadas com erro`} danger={errorRate > 5} />
      </div>

      {rate > 0 ? (
        <p className="rounded-control border border-border bg-card px-3 py-2 text-xs text-muted-foreground shadow-soft">
          Cotação usada: <span className="font-medium text-foreground">US$ 1 = R$ {rate.toFixed(2)}</span>
          <span className="ml-1 opacity-70">({telemetry.rate_source || "fonte não informada"})</span>
        </p>
      ) : null}

      {!error && !telemetry.has_data ? (
        <div className="rounded-card bg-card p-6 text-sm text-muted-foreground shadow-soft">
          Ainda não há chamadas de IA registradas neste período.
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_23rem]">
        {telemetry.daily.length > 0 ? (
          <section className="rounded-card border border-border/80 bg-card p-4 shadow-soft">
            <div className="mb-4">
              <h2 className="text-base font-semibold">Gasto diário</h2>
              <p className="mt-1 text-xs text-muted-foreground">Valores em reais no período selecionado</p>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={telemetry.daily} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `R$${(v / 100).toFixed(0)}`} width={48} />
                <Tooltip formatter={(v: number) => [formatBRLCents(v), "Custo"]} labelFormatter={(l: string) => `Data: ${l}`} cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="cost_brl_cents" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </section>
        ) : null}

        <section className="rounded-card border border-border/80 bg-card p-4 shadow-soft">
          <h2 className="text-base font-semibold">Maiores custos</h2>
          <p className="mt-1 text-xs text-muted-foreground">Workflows ordenados por gasto</p>
          <div className="mt-4 grid gap-3">
            {topWorkflows.map((workflow) => (
              <WorkflowCostRow key={workflow.workflow} workflow={workflow} maxCost={maxWorkflowCost} />
            ))}
            {!topWorkflows.length ? <p className="text-sm text-muted-foreground">Sem workflows no período.</p> : null}
          </div>
        </section>
      </div>

      <section className="rounded-card border border-border/80 bg-card shadow-soft">
        <div className="border-b p-4">
          <h2 className="text-base font-semibold">Detalhe técnico</h2>
          <p className="mt-1 text-xs text-muted-foreground">Use para investigar erro, latência ou consumo fora do normal.</p>
        </div>
        <div className="mobile-scroll overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left">
              <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Agente</th>
                <th className="px-4 py-3 font-medium">Workflow</th>
                <th className="px-4 py-3 font-medium tabular-nums">Chamadas</th>
                <th className="px-4 py-3 font-medium tabular-nums">Erros</th>
                <th className="px-4 py-3 font-medium tabular-nums">Tokens</th>
                <th className="px-4 py-3 font-medium tabular-nums">Latência</th>
                <th className="px-4 py-3 font-medium tabular-nums">Custo</th>
              </tr>
            </thead>
            <tbody>
              {telemetry.agents.map((agent: AgentStats) => (
                <tr key={`${agent.workflow}:${agent.agent}`} className="border-b last:border-b-0 hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{agentLabel(agent.agent)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{workflowLabel(agent.workflow)}</td>
                  <td className="px-4 py-3 tabular-nums">{agent.total_calls}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {agent.error_calls > 0 ? <Badge variant="destructive" className="text-xs">{agent.error_calls}</Badge> : <span className="text-muted-foreground">0</span>}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{formatTokens(agent.total_tokens)}</td>
                  <td className="px-4 py-3 tabular-nums">{agent.avg_latency_ms.toLocaleString("pt-BR")} ms</td>
                  <td className="px-4 py-3 tabular-nums font-medium">{formatBRLCents(agent.cost_brl_cents)}</td>
                </tr>
              ))}
              {telemetry.agents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Sem dados nesse período.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {telemetry.top_users.length > 0 ? (
        <section className="rounded-card border border-border/80 bg-card shadow-soft">
          <div className="border-b p-4">
            <h2 className="text-base font-semibold">Maiores consumidores</h2>
          </div>
          <div className="divide-y">
            {telemetry.top_users.slice(0, 8).map((user, index) => (
              <div key={user.user_id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-6 text-xs text-muted-foreground tabular-nums">#{index + 1}</span>
                  <span className="truncate text-sm font-medium">{user.label}</span>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums">{formatBRLCents(user.cost_brl_cents)}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">{formatTokens(user.total_tokens)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value, hint, strong, danger }: { label: string; value: string; hint?: string; strong?: boolean; danger?: boolean }) {
  return (
    <div className={`rounded-card border border-border/80 p-4 shadow-soft ${strong ? "bg-foreground text-background" : "bg-card"}`}>
      <p className={strong ? "text-xs font-medium text-background/70" : "text-xs font-medium text-muted-foreground"}>{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums tracking-normal ${danger ? "text-destructive" : ""}`}>{value}</p>
      {hint ? <p className={strong ? "mt-1 text-xs text-background/70" : "mt-1 text-xs text-muted-foreground"}>{hint}</p> : null}
    </div>
  );
}

function WorkflowCostRow({ workflow, maxCost }: { workflow: WorkflowStats; maxCost: number }) {
  const width = maxCost ? Math.max(4, (workflow.cost_brl_cents / maxCost) * 100) : 0;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="truncate text-sm font-medium">{workflowLabel(workflow.workflow)}</span>
        <span className="shrink-0 text-sm font-semibold tabular-nums">{formatBRLCents(workflow.cost_brl_cents)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{workflow.total_calls} chamadas · {formatTokens(workflow.total_tokens)}</p>
    </div>
  );
}
