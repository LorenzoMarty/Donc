"use client";

import { AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, Clock, Sparkles } from "lucide-react";

import { contentQualityTotal, countPublished, countRecentlyCreated } from "@/app/(app)/admin/_tabs/overview-metrics";
import { Card, CardContent } from "@/components/ui/card";
import type { AdminContentQuality, AIGeneratedGame, EssayTheme, UserActivity } from "@/types/api";

const EVENT_LABELS: Record<string, string> = {
  page_view: "Visitas de página",
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

function ActionCard({
  title,
  value,
  detail,
  icon: Icon,
  onClick,
}: {
  title: string;
  value: number;
  detail: string;
  icon: typeof Sparkles;
  onClick?: () => void;
}) {
  const content = (
    <CardContent className="p-4 lg:p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-safe mt-2 text-3xl font-semibold tracking-normal">{value}</p>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-md border border-primary/20 bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{detail}</p>
    </CardContent>
  );

  if (!onClick) return <Card>{content}</Card>;

  return (
    <Card className="p-0">
      <button type="button" onClick={onClick} className="w-full rounded-[inherit] text-left transition-colors hover:bg-muted/40">
        {content}
      </button>
    </Card>
  );
}

/** REQ-1..6 (P3c): 4 indicadores acionáveis (o que está publicado, aguardando revisão, criado
 * recentemente, precisando de atenção) substituem a antiga grade de métricas genéricas de uso —
 * cada número vem de dado real já existente no sistema (REQ-9), nada estimado/mockado. */
export function AdminOverviewTab({
  games,
  themes,
  reviewQueueCount,
  contentQuality,
  activity,
  onOpenTab,
}: {
  games: AIGeneratedGame[];
  themes: EssayTheme[];
  reviewQueueCount: number;
  contentQuality: AdminContentQuality | null;
  activity: UserActivity;
  onOpenTab: (tab: string) => void;
}) {
  const ranked = [...activity.by_type].sort((a, b) => b.count - a.count);
  const mostUsed = ranked[0];
  const leastUsed = ranked.length > 1 ? ranked[ranked.length - 1] : null;
  const maxCount = mostUsed?.count ?? 0;

  const published = countPublished(games, themes);
  const recentlyCreated = countRecentlyCreated(games, themes, new Date());
  const needsAttention = contentQuality ? contentQualityTotal(contentQuality) : 0;

  return (
    <div className="space-y-6">
      <div className="fluid-grid gap-4 [--grid-min:15rem]">
        <ActionCard title="Publicados" value={published} detail="Jogos e temas aprovados" icon={CheckCircle2} />
        <ActionCard
          title="Aguardando revisão"
          value={reviewQueueCount}
          detail="Conteúdo gerado por IA pendente"
          icon={Clock}
          onClick={() => onOpenTab("review-queue")}
        />
        <ActionCard title="Criados recentemente" value={recentlyCreated} detail="Últimos 7 dias" icon={Sparkles} />
        <ActionCard
          title="Precisa atenção"
          value={needsAttention}
          detail="Conteúdo sem objetivo, não usado ou rejeitado"
          icon={AlertTriangle}
          onClick={() => onOpenTab("content-quality")}
        />
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

      <div className="rounded-card bg-card shadow-soft">
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
    <div className="rounded-card bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className={tone === "up" ? "h-4 w-4 text-success" : "h-4 w-4 text-streak"} />
        {title}
      </div>
      <p className="mt-2 text-lg font-semibold">{label}</p>
      <p className="text-xs text-muted-foreground">{count.toLocaleString("pt-BR")} eventos</p>
    </div>
  );
}
