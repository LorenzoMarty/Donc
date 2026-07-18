"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, ChevronDown, ClipboardList, Flame, Lock, PlayCircle, Sparkles, type LucideIcon } from "lucide-react";

import { ErrorState } from "@/components/shared/error-state";
import { LessonPosterCard } from "@/components/shared/lesson-poster-card";
import { LoadingCard } from "@/components/shared/loading-card";
import { MotionShell } from "@/components/shared/motion-shell";
import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { Rail } from "@/components/shared/rail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { apiFetch, type Dashboard, type Lesson, type Module } from "@/services/api";
import type { ModuleItem } from "@/types/api";
import { cn } from "@/utils";

const difficultyLabel: Record<string, string> = {
  easy: "essencial",
  medium: "intermediaria",
  hard: "avancada",
};

export default function LessonsPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadModules = useCallback(() => {
    return Promise.all([apiFetch<Module[]>("/lessons/modules"), apiFetch<Dashboard>("/dashboard").catch(() => null)])
      .then(([modulesData, dashboardData]) => {
        setModules(modulesData);
        setDashboard(dashboardData);
        setError("");
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Não foi possível carregar as aulas."))
      .finally(() => setLoading(false));
  }, []);

  function retryLoadModules() {
    setLoading(true);
    setError("");
    loadModules();
  }

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  if (error) return <ErrorState description={error} onRetry={retryLoadModules} />;

  if (loading) {
    return (
      <div className="fluid-grid gap-3 [--grid-min:16rem]">
        <LoadingCard />
        <LoadingCard />
      </div>
    );
  }

  const lessonById = new Map(modules.flatMap((module) => module.lessons ?? []).map((lesson) => [lesson.id, lesson]));
  const featuredModule = modules.find((module) => !module.completed) ?? modules[0] ?? null;
  const continueWatching = (dashboard?.recent_lessons ?? []).filter((entry) => entry.progress_percent > 0 && entry.progress_percent < 100);
  const recommended = dashboard?.suggested_lessons ?? [];

  return (
    <MotionShell className="space-y-6">
      <PageHeader
        eyebrow="Aulas"
        title="Escolha o que assistir"
        description="Continue de onde parou, veja o que a gente recomenda e explore os módulos no seu ritmo."
      />

      {featuredModule ? <ModuleHero module={featuredModule} /> : null}

      {continueWatching.length ? (
        <Rail title="Continuar assistindo">
          {continueWatching.map((entry) => (
            <LessonPosterCard
              key={`continue-${entry.id}`}
              lesson={{
                id: entry.id,
                title: entry.title,
                href: `/aulas/${entry.id}`,
                moduleLabel: entry.module,
                progressPercent: entry.progress_percent,
                fallbackSeed: entry.title,
                durationMinutes: lessonById.get(entry.id)?.duration_minutes,
                xpReward: lessonById.get(entry.id)?.xp_reward,
              }}
            />
          ))}
        </Rail>
      ) : null}

      {recommended.length ? (
        <Rail
          title="Recomendado pra você"
          action={<Sparkles className="h-4 w-4 text-highlight" aria-hidden="true" />}
        >
          {recommended.map((entry) => (
            <LessonPosterCard
              key={`suggested-${entry.id}`}
              lesson={{
                id: entry.id,
                title: entry.title,
                href: `/aulas/${entry.id}`,
                moduleLabel: entry.module,
                progressPercent: entry.progress_percent,
                fallbackSeed: entry.title,
                durationMinutes: lessonById.get(entry.id)?.duration_minutes,
                xpReward: lessonById.get(entry.id)?.xp_reward,
              }}
            />
          ))}
        </Rail>
      ) : null}

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Todos os módulos</p>
        <div className="space-y-2.5">
          {modules.map((module, index) => (
            <ModuleAccordion key={module.id} module={module} index={index} />
          ))}
        </div>
      </div>
    </MotionShell>
  );
}

/** Banner de destaque: primeiro módulo não concluído, com CTA direto pra próxima aula disponível. */
function ModuleHero({ module }: { module: Module }) {
  const items = module.items?.length ? module.items : module.lessons.map((lesson) => ({ id: -lesson.id, kind: "lesson" as const, order: lesson.order, lesson, activity: null }));
  const nextLesson = items.find((item) => item.kind === "lesson" && item.lesson && !item.lesson.progress.completed)?.lesson;
  const progress = module.progress_percent ?? 0;

  return (
    <Surface className="relative overflow-hidden p-5 lg:p-7">
      <div
        className="absolute inset-0 opacity-90"
        style={{ background: `linear-gradient(120deg, ${module.color || "hsl(var(--primary))"} 0%, transparent 65%)` }}
        aria-hidden="true"
      />
      <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <Badge variant="secondary" className="mb-3">
            Continue sua trilha
          </Badge>
          <h2 className="text-safe text-2xl font-semibold tracking-normal lg:text-3xl">{module.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground lg:text-base">{module.description}</p>
          <div className="mt-4 flex max-w-xs items-center gap-3">
            <Progress value={progress} className="h-2" />
            <span className="shrink-0 text-sm font-semibold">{progress}%</span>
          </div>
        </div>
        {nextLesson ? (
          <Button asChild size="lg" className="shrink-0">
            <Link href={`/aulas/${nextLesson.id}`}>
              <PlayCircle className="h-4 w-4" aria-hidden="true" />
              {nextLesson.progress.progress_percent > 0 ? "Continuar aula" : "Começar aula"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        ) : null}
      </div>
    </Surface>
  );
}

function ModuleAccordion({ module, index }: { module: Module; index: number }) {
  const [open, setOpen] = useState(index === 0);
  const lessons = module.lessons ?? [];
  const items = module.items?.length ? module.items : lessons.map((lesson) => ({ id: -lesson.id, kind: "lesson" as const, order: lesson.order, lesson, activity: null }));
  const completedLessons = lessons.filter((lesson) => lesson.progress.completed).length;
  const moduleProgress = module.progress_percent ?? progressFromLessons(lessons);
  const locked = Boolean(module.locked);
  const requirements = module.unlock_requirements ?? [];

  return (
    <Surface className="relative overflow-hidden p-4 lg:p-4">
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: module.color || "hsl(var(--primary))" }}
        aria-hidden="true"
      />
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 text-left" aria-expanded={open}>
        <span
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center rounded-control text-sm font-semibold",
            locked ? "bg-muted text-muted-foreground" : "bg-primary/12 text-primary",
          )}
        >
          {locked ? <Lock className="h-4 w-4" aria-hidden="true" /> : index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-safe text-lg font-semibold tracking-normal">{module.title}</h3>
            {locked ? (
              <Badge variant="outline">bloqueado</Badge>
            ) : module.completed ? (
              <Badge variant="success">módulo concluído</Badge>
            ) : null}
            <Badge variant="outline">{module.xp_reward ?? 75}xp bonus</Badge>
          </div>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{module.description}</p>
          {locked && requirements.length ? (
            <p className="mt-1 text-xs font-medium text-muted-foreground">Bloqueado — {requirements.join(" · ")}</p>
          ) : null}
        </div>
        <span className="shrink-0 rounded-full bg-primary/12 px-2 py-1 text-xs font-semibold text-primary md:hidden">{moduleProgress}%</span>
        <div className="hidden min-w-[12rem] items-center gap-3 md:flex">
          <Progress value={moduleProgress} className="h-1.5" />
          <span className="w-10 text-right text-sm font-semibold">{moduleProgress}%</span>
        </div>
        <ChevronDown
          className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div className="mt-4 border-t border-border pt-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Conteúdo do módulo</p>
            <div className="flex items-center gap-3">
              <CompactMetric icon={Flame} label="Rank" value={module.user_rank?.name ?? "Aprendiz"} tone="streak" />
              <span className="text-xs font-semibold text-muted-foreground">
                {completedLessons}/{lessons.length} aulas
              </span>
            </div>
          </div>
          <Rail>
            {items.map((item) =>
              item.kind === "lesson" && item.lesson ? (
                <LessonPosterCard
                  key={`lesson-${item.id}`}
                  lesson={{
                    id: item.lesson.id,
                    title: item.lesson.title,
                    href: `/aulas/${item.lesson.id}`,
                    thumbnailUrl: item.lesson.thumbnail_url,
                    durationMinutes: item.lesson.duration_minutes,
                    xpReward: item.lesson.xp_reward,
                    progressPercent: item.lesson.progress?.progress_percent ?? 0,
                    completed: item.lesson.progress?.completed ?? false,
                    fallbackSeed: item.lesson.title,
                    locked,
                  }}
                />
              ) : null,
            )}
          </Rail>
          <div className="mt-3 grid gap-1.5">
            {items.map((item) =>
              item.kind !== "lesson" && item.activity ? (
                <ActivityRow key={`activity-${item.id}`} item={item} moduleOrder={module.order} />
              ) : null,
            )}
          </div>
        </div>
      ) : null}
    </Surface>
  );
}

function ActivityRow({ item, moduleOrder }: { item: ModuleItem; moduleOrder: number }) {
  const activity = item.activity;
  if (!activity) return null;
  return (
    <div className="flex min-h-11 items-center gap-3 rounded-control bg-streak-tint/60 px-2.5 py-1.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center text-streak">
        <ClipboardList className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-safe block text-sm font-semibold">
          {moduleOrder}.{item.order} - Atividade de fixação
        </span>
        <span className="line-clamp-1 text-xs text-muted-foreground">{activity.statement}</span>
      </span>
      <Badge variant="outline" className="shrink-0 text-xs">{difficultyLabel[activity.difficulty] ?? "essencial"}</Badge>
    </div>
  );
}

const METRIC_TONE = {
  streak: "text-streak",
  highlight: "text-highlight",
} as const;

function CompactMetric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: keyof typeof METRIC_TONE;
}) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <Icon className={cn("h-3.5 w-3.5", METRIC_TONE[tone])} aria-hidden="true" />
      {label}: <span className={cn("font-semibold", METRIC_TONE[tone])}>{value}</span>
    </span>
  );
}

function progressFromLessons(lessons: Lesson[]) {
  if (!lessons.length) return 0;
  return Math.round(lessons.reduce((sum, lesson) => sum + (lesson.progress?.progress_percent ?? 0), 0) / lessons.length);
}
