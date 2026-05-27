"use client";

import { BarChart3, BookOpen, FileText, Users, Wifi, Zap } from "lucide-react";

import { MetricCard } from "@/components/shared/metric-card";
import type { AdminMetrics, UserActivity } from "@/types/api";

export function AdminOverviewTab({ metrics, activity }: { metrics: AdminMetrics; activity: UserActivity }) {
  const eventLabels: Record<string, string> = {
    page_view: "Visitas de página",
    game_started: "Jogos iniciados",
    game_completed: "Jogos concluídos",
    essay_started: "Redações iniciadas",
    essay_submitted: "Redações enviadas",
    lesson_opened: "Aulas abertas",
  };

  return (
    <div className="space-y-6">
      <div className="fluid-grid gap-4 [--grid-min:15rem]">
        <MetricCard title="Usuários" value={`${metrics.users}`} detail="Contas cadastradas" icon={Users} />
        <MetricCard title="Redações" value={`${metrics.essays}`} detail={`${metrics.corrected_essays} corrigidas`} icon={FileText} />
        <MetricCard title="Aulas" value={`${metrics.lessons}`} detail={`${metrics.exercises} exercícios`} icon={BookOpen} />
        <MetricCard title="Média geral" value={`${metrics.average_score}`} detail={`${metrics.active_themes} temas ativos`} icon={BarChart3} />
        <MetricCard title="Online agora" value={`${activity.online_now}`} detail="Ativos nos últimos 5 min" icon={Wifi} />
        <MetricCard title="Eventos hoje" value={`${activity.total_events}`} detail={`Últimos ${activity.period_days} dias`} icon={Zap} />
      </div>

      <div className="rounded-lg border bg-card">
        <div className="border-b p-4">
          <h2 className="font-semibold">O que os usuários fazem mais</h2>
          <p className="mt-1 text-xs text-muted-foreground">Últimos {activity.period_days} dias</p>
        </div>
        <div className="divide-y">
          {activity.by_type.map((item) => (
            <div key={item.event_type} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm">{eventLabels[item.event_type] ?? item.event_type}</span>
              <span className="text-sm font-semibold tabular-nums">{item.count.toLocaleString("pt-BR")}</span>
            </div>
          ))}
          {activity.by_type.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Sem eventos registrados no período.</p>
          )}
        </div>
      </div>
    </div>
  );
}
