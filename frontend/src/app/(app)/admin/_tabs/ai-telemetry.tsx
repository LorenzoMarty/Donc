"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import type { AgentStats, AITelemetry } from "@/types/api";

function centsToDollars(cents: number) {
  return `$${(cents / 100).toFixed(4)}`;
}

function formatTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function AITelemetryTab({
  telemetry,
  onPeriodChange,
}: {
  telemetry: AITelemetry;
  onPeriodChange: (days: number) => Promise<void>;
}) {
  const [period, setPeriod] = useState(30);
  const [loading, setLoading] = useState(false);

  async function changePeriod(days: number) {
    setPeriod(days);
    setLoading(true);
    try {
      await onPeriodChange(days);
    } finally {
      setLoading(false);
    }
  }

  const errorRate = telemetry.total_calls ? Math.round((telemetry.error_calls / telemetry.total_calls) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Period selector */}
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

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Tokens totais", value: formatTokens(telemetry.total_tokens) },
          { label: "Custo estimado", value: centsToDollars(telemetry.cost_usd_cents) },
          { label: "Chamadas", value: telemetry.total_calls.toLocaleString("pt-BR") },
          { label: "Taxa de erro", value: `${errorRate}%`, error: errorRate > 5 },
        ].map((c) => (
          <div key={c.label} className="rounded-lg border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{c.label}</p>
            <p className={`mt-2 text-2xl font-bold ${c.error ? "text-destructive" : ""}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Daily chart */}
      {telemetry.daily.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <h2 className="mb-4 font-semibold">Tokens por dia</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={telemetry.daily} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatTokens(v)} width={48} />
              <Tooltip
                formatter={(v: number, name: string) => [name === "total_tokens" ? formatTokens(v) : v, name === "total_tokens" ? "Tokens" : "Erros"]}
                labelFormatter={(l: string) => `Data: ${l}`}
              />
              <Bar dataKey="total_tokens" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
              <Bar dataKey="error_calls" fill="hsl(var(--destructive))" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Per-agent table */}
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
                  <td className="px-4 py-3 tabular-nums font-mono text-xs">{centsToDollars(agent.cost_usd_cents)}</td>
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

      {/* Top users by cost */}
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
                  <span className="tabular-nums font-mono text-xs font-semibold">{centsToDollars(u.cost_usd_cents)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
