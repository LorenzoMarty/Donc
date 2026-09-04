import { Activity, Clock, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { HUBS } from "@/features/gamification/symptoms";
import type { AdminPedagogicalMetrics } from "@/types/api";

// Mesmo par issue->hub replicado em content-quality.tsx e review-queue.tsx (fonte real é
// backend/src/memory/cognitive_issues.py::HUB_TO_ISSUE) — só pra rotular o código pt-BR aqui.
const HUB_FOR_ISSUE: Record<string, keyof typeof HUBS> = {
  TEXT_ROBOTIC: "texto-robotico",
  REPETITIVE_IDEAS: "repete-ideias",
  WEAK_REPERTOIRE: "repertorio-nao-encaixa",
  SHALLOW_ARGUMENTATION: "nao-aprofunda",
  WEAK_THESIS: "introducao-sem-tese",
  C3_LOW: "perde-na-c3",
  FORMULAIC_CONCLUSION: "conclusao-formula",
};

const ACTION_TYPE_LABEL: Record<string, string> = {
  LESSON: "Aulas",
  EXERCISE: "Exercícios",
  GAME: "Jogos",
  ESSAY: "Redações",
};

function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return `${Math.round(value * 100)}%`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}

/**
 * REQ-19/20 (P2a Bloco 6): única tela que responde "o motor adaptativo está de fato mudando
 * recomendação e isso correlaciona com melhora do aluno?" — o backend (AdminPedagogicalMetricsService,
 * já testado) calculava isso há tempo, mas nenhuma tela consumia o endpoint (auditoria de UX, achado
 * de produto "métrica órfã"). Sem cobertura mínima de RecommendationLog, os números aparecem zerados
 * — isso por si só já é um sinal (motor sem uso real ainda), não um bug de tela.
 */
export function PedagogicalMetricsTab({ report }: { report: AdminPedagogicalMetrics }) {
  const actionTypes = Object.keys(report.avg_completion_seconds_by_type).sort();
  const hasCycles = report.before_after_by_issue.some((row) => row.cycles > 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <FunnelStat label="Recomendações mostradas" value={report.shown} />
        <FunnelStat label="Iniciadas" value={report.started} sub={`${formatPercent(report.start_rate)} das mostradas`} />
        <FunnelStat label="Concluídas" value={report.completed} sub={`${formatPercent(report.completion_rate)} das iniciadas`} />
      </div>

      <div className="rounded-card border border-border/80 bg-card p-4 shadow-soft">
        <div className="flex gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-control bg-primary/10 text-primary">
            <TrendingUp className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-semibold">O motor adaptativo está funcionando?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Compara o estado do problema cognitivo antes e depois de uma recomendação ser concluída. &quot;Melhorou&quot; exige
              evidência negativa antes e positiva depois — uma única evidência não conta.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-card border border-border/80 bg-card shadow-soft">
        <div className="flex items-center gap-2 border-b p-4">
          <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-semibold">Tempo médio até concluir</p>
        </div>
        {actionTypes.length ? (
          <div className="grid gap-3 p-4 sm:grid-cols-4">
            {actionTypes.map((type) => (
              <div key={type} className="rounded-control bg-background/70 p-3 text-center">
                <p className="text-xs text-muted-foreground">{ACTION_TYPE_LABEL[type] ?? type}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{formatDuration(report.avg_completion_seconds_by_type[type])}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-4 text-sm text-muted-foreground">Sem recomendações concluídas ainda para medir tempo.</p>
        )}
      </div>

      <div className="rounded-card border border-border/80 bg-card shadow-soft">
        <div className="flex items-center gap-2 border-b p-4">
          <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold">Antes/depois por problema cognitivo</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Ciclos = recomendação concluída com evidência de antes e depois.</p>
          </div>
        </div>
        {hasCycles ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Problema</th>
                  <th className="px-4 py-3 font-medium tabular-nums">Ciclos</th>
                  <th className="px-4 py-3 font-medium tabular-nums">Melhorou</th>
                  <th className="px-4 py-3 font-medium tabular-nums">Sem melhora</th>
                  <th className="px-4 py-3 font-medium">Taxa</th>
                </tr>
              </thead>
              <tbody>
                {report.before_after_by_issue.map((row) => {
                  const hub = HUB_FOR_ISSUE[row.issue];
                  const label = hub ? HUBS[hub].label : row.issue;
                  const rate = row.cycles ? row.improved / row.cycles : null;
                  return (
                    <tr key={row.issue} className="border-b last:border-b-0 hover:bg-muted/40">
                      <td className="px-4 py-3 font-medium">{label}</td>
                      <td className="px-4 py-3 tabular-nums">{row.cycles}</td>
                      <td className="px-4 py-3 tabular-nums">{row.improved}</td>
                      <td className="px-4 py-3 tabular-nums">{row.unchanged_or_worse}</td>
                      <td className="px-4 py-3">
                        <Badge variant={rate !== null && rate >= 0.5 ? "success" : "outline"} className="text-xs">
                          {formatPercent(rate)}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-4 text-sm text-muted-foreground">
            Nenhum ciclo completo (recomendação concluída com evidência de antes e depois) registrado ainda — sem dado
            suficiente pra dizer se o motor está funcionando.
          </p>
        )}
      </div>
    </div>
  );
}

function FunnelStat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-card border border-border/80 bg-card p-4 shadow-soft">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums tracking-normal">{value.toLocaleString("pt-BR")}</p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}
