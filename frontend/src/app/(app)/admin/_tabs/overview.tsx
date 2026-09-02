"use client";

import { AlertTriangle, CheckCircle2, Clock, FileText, Sparkles, Users } from "lucide-react";

import { contentQualityTotal, countPublished, countRecentlyCreated } from "@/app/(app)/admin/_tabs/overview-metrics";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AdminContentQuality, AIGeneratedGame, EssayTheme, UserActivity } from "@/types/api";
import type { AdminMetrics } from "@/services/api";

const EVENT_LABELS: Record<string, string> = {
  page_view: "Visitas",
  game_started: "Jogos iniciados",
  game_completed: "Jogos concluídos",
  essay_started: "Redações iniciadas",
  essay_submitted: "Redações enviadas",
  lesson_opened: "Aulas abertas",
  lesson_completed: "Aulas concluídas",
};

function labelFor(eventType: string) {
  return EVENT_LABELS[eventType] ?? eventType;
}

export function AdminOverviewTab({
  metrics,
  games,
  themes,
  reviewQueueCount,
  contentQuality,
  activity,
  onOpenTab,
}: {
  metrics: AdminMetrics;
  games: AIGeneratedGame[];
  themes: EssayTheme[];
  reviewQueueCount: number;
  contentQuality: AdminContentQuality | null;
  activity: UserActivity;
  onOpenTab: (tab: string) => void;
}) {
  const ranked = [...activity.by_type].sort((a, b) => b.count - a.count).slice(0, 6);
  const maxCount = ranked[0]?.count ?? 0;
  const published = countPublished(games, themes);
  const recentlyCreated = countRecentlyCreated(games, themes, new Date());
  const needsAttention = contentQuality ? contentQualityTotal(contentQuality) : 0;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <PriorityCard
            title="Revisar agora"
            value={reviewQueueCount}
            detail="Itens aguardando decisão"
            icon={Clock}
            tone={reviewQueueCount ? "warning" : "neutral"}
            actionLabel="Abrir fila"
            onClick={() => onOpenTab("review-queue")}
          />
          <PriorityCard
            title="Corrigir cobertura"
            value={needsAttention}
            detail="Lacunas que afetam recomendações"
            icon={AlertTriangle}
            tone={needsAttention ? "danger" : "neutral"}
            actionLabel="Ver qualidade"
            onClick={() => onOpenTab("content-quality")}
          />
          <PriorityCard
            title="Conteúdo publicado"
            value={published}
            detail="Jogos e temas aprovados"
            icon={CheckCircle2}
            tone="success"
          />
        </div>

        <Card className="overflow-hidden p-0">
          <CardContent className="p-0">
            <div className="border-b px-4 py-3 md:px-5">
              <h2 className="text-base font-semibold">Uso recente</h2>
              <p className="mt-1 text-xs text-muted-foreground">Principais eventos dos últimos {activity.period_days} dias</p>
            </div>
            <div className="divide-y">
              {ranked.map((item) => (
                <div key={item.event_type} className="px-4 py-3 md:px-5">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">{labelFor(item.event_type)}</span>
                    <span className="text-sm font-semibold tabular-nums">{item.count.toLocaleString("pt-BR")}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-[hsl(var(--info))]"
                      style={{ width: `${maxCount ? Math.max(5, (item.count / maxCount) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              ))}
              {ranked.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">Sem eventos registrados no período.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>

      <aside className="space-y-4">
        <div className="rounded-card border border-border/80 bg-card p-4 shadow-soft">
          <h2 className="text-sm font-semibold">Resumo operacional</h2>
          <div className="mt-3 grid gap-2">
            <SummaryRow icon={Users} label="Alunos" value={metrics.users} />
            <SummaryRow icon={FileText} label="Redações corrigidas" value={metrics.corrected_essays} />
            <SummaryRow icon={Sparkles} label="Criados em 7 dias" value={recentlyCreated} />
            <SummaryRow icon={CheckCircle2} label="Temas ativos" value={metrics.active_themes} />
          </div>
        </div>

        <div className="rounded-card border border-border/80 bg-card p-4 shadow-soft">
          <h2 className="text-sm font-semibold">Próximas ações</h2>
          <div className="mt-3 grid gap-2">
            <ActionLine label="Revisões pendentes" value={reviewQueueCount} onClick={() => onOpenTab("review-queue")} />
            <ActionLine label="Qualidade de conteúdo" value={needsAttention} onClick={() => onOpenTab("content-quality")} />
            <ActionLine label="Gestão de temas" value={themes.length} onClick={() => onOpenTab("themes")} />
          </div>
        </div>
      </aside>
    </div>
  );
}

function PriorityCard({
  title,
  value,
  detail,
  icon: Icon,
  tone,
  actionLabel,
  onClick,
}: {
  title: string;
  value: number;
  detail: string;
  icon: typeof Clock;
  tone: "warning" | "danger" | "success" | "neutral";
  actionLabel?: string;
  onClick?: () => void;
}) {
  const toneClass = {
    warning: "bg-warning/10 text-warning border-warning/20",
    danger: "bg-destructive/10 text-destructive border-destructive/20",
    success: "bg-success/10 text-success border-success/20",
    neutral: "bg-muted text-muted-foreground border-border",
  }[tone];

  return (
    <Card className="p-0">
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums tracking-normal">{value.toLocaleString("pt-BR")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </div>
          <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-control border ${toneClass}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>
        {actionLabel && onClick ? (
          <Button type="button" size="sm" variant="outline" className="mt-4 w-full" onClick={onClick}>
            {actionLabel}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SummaryRow({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-control bg-background/70 px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="truncate text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="text-sm font-semibold tabular-nums">{value.toLocaleString("pt-BR")}</span>
    </div>
  );
}

function ActionLine({ label, value, onClick }: { label: string; value: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between gap-3 rounded-control border border-border bg-background/50 px-3 py-2 text-left transition-colors hover:bg-muted"
    >
      <span className="text-sm font-medium">{label}</span>
      <span className={value ? "text-sm font-semibold tabular-nums text-destructive" : "text-sm font-semibold tabular-nums text-muted-foreground"}>
        {value.toLocaleString("pt-BR")}
      </span>
    </button>
  );
}
