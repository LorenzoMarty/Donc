"use client";

import { ArrowDownRight, ArrowUpRight, BarChart3, BookOpen, FileText, Users, Wifi, Zap } from "lucide-react";

import { MetricCard } from "@/components/shared/metric-card";
import type { AdminMetrics, UserActivity } from "@/types/api";

const EVENT_LABELS: Record<string, string> = {
  page_view: "Visitas de página",
  game_started: "Jogos iniciados",
  game_completed: "Jogos concluídos",
  essay_started: "Redações iniciadas",
  essay_submitted: "Redações enviadas",
  lesson_opened: "Aulas abertas",
  lesson_completed: "Aulas concluídas",
  exam_started: "Simulados iniciados",
  exam_submitted: "Simulados enviados",
};

function labelFor(eventType: string) {
  return EVENT_LABELS[eventType] ?? eventType;
}

export function AdminOverviewTab({ metrics, activity }: { metrics: AdminMetrics; activity: UserActivity }) {
  const ranked = [...activity.by_type].sort((a, b) => b.count - a.count);
  const mostUsed = ranked[0];
  const leastUsed = ranked.length > 1 ? ranked[ranked.length - 1] : null;
  const maxCount = mostUsed?.count ?? 0;

  return (
    <div className="space-y-6">
      <div className="fluid-grid gap-4 [--grid-min:15rem]">
        <MetricCard title="Usuários" value={`${metrics.users}`} detail="Contas cadastradas" icon={Users} />
        <MetricCard title="Redações" value={`${metrics.essays}`} detail={`${metrics.corrected_essays} corrigidas`} icon={FileText} />
        <MetricCard title="Aulas" value={`${metrics.lessons}`} detail={`${metrics.exercises} exercícios`} icon={BookOpen} />
        <MetricCard title="Média geral" value={`${metrics.average_score}`} detail={`${metrics.active_themes} temas ativos`} icon={BarChart3} />
        <MetricCard title="Online agora" value={`${activity.online_now}`} detail="Ativos nos últimos 5 min" icon={Wifi} />
        <MetricCard title="Eventos" value={`${activity.total_events}`} detail={`Últimos ${activity.period_days} dias`} icon={Zap} />
      </div>

      {ranked.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <HighlightCard
            tone="up"
            title="Funcionalidade mais usada"
            label={mostUsed ? labelFor(mostUsed.event_type) : "-"}
            count={mostUsed?.count ?? 0}
          />
          <HighlightCard
            tone="down"
            title="Funcionalidade menos usada"
            label={leastUsed ? labelFor(leastUsed.event_type) : "-"}
            count={leastUsed?.count ?? 0}
          />
        </div>
      ) : null}

      <div className="rounded-lg border bg-card">
        <div className="border-b p-4">
          <h2 className="font-semibold">Uso por funcionalidade</h2>
          <p className="mt-1 text-xs text-muted-foreground">Últimos {activity.period_days} dias</p>
        </div>
        <div className="divide-y">
          {ranked.map((item) => (
            <div key={item.event_type} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">{labelFor(item.event_type)}</span>
                <span className="text-sm font-semibold tabular-nums">{item.count.toLocaleString("pt-BR")}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${maxCount ? Math.max(4, (item.count / maxCount) * 100) : 0}%` }}
                />
              </div>
            </div>
          ))}
          {ranked.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Sem eventos registrados no período.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function HighlightCard({ tone, title, label, count }: { tone: "up" | "down"; title: string; label: string; count: number }) {
  const Icon = tone === "up" ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className={tone === "up" ? "h-4 w-4 text-emerald-500" : "h-4 w-4 text-amber-500"} />
        {title}
      </div>
      <p className="mt-2 text-lg font-semibold">{label}</p>
      <p className="text-xs text-muted-foreground">{count.toLocaleString("pt-BR")} eventos</p>
    </div>
  );
}
