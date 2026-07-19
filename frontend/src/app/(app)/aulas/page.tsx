"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, BookOpen, ChevronDown, ClipboardList, Flame, Lock, PlayCircle, Sparkles, type LucideIcon } from "lucide-react";

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

      {featuredModule ? <ModuleHero module={featuredModule} streakDays={dashboard?.streak_days} /> : null}

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

const heroHeadline = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

const heroItem = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};

/** Banner de destaque: primeiro módulo não concluído, com CTA direto pra próxima aula disponível. */
function ModuleHero({ module, streakDays }: { module: Module; streakDays?: number }) {
  const items = module.items?.length ? module.items : module.lessons.map((lesson) => ({ id: -lesson.id, kind: "lesson" as const, order: lesson.order, lesson, activity: null }));
  const nextLesson = items.find((item) => item.kind === "lesson" && item.lesson && !item.lesson.progress.completed)?.lesson;
  const progress = module.progress_percent ?? 0;
  const totalLessons = module.lessons.length;
  const remainingLessons = module.lessons.filter((lesson) => !lesson.progress.completed).length;
  const accent = module.color || "hsl(var(--primary))";

  return (
    <Surface className="relative overflow-hidden p-5 lg:p-8">
      <div
        className="absolute inset-0 opacity-90"
        style={{ background: `linear-gradient(120deg, ${accent} 0%, transparent 65%)` }}
        aria-hidden="true"
      />
      <motion.div
        className="absolute -right-16 -top-24 h-64 w-64 rounded-full blur-3xl"
        style={{ backgroundColor: accent }}
        aria-hidden="true"
        animate={{ opacity: [0.12, 0.24, 0.12], scale: [1, 1.08, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        variants={heroHeadline}
        initial="hidden"
        animate="show"
        className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"
      >
        <div className="min-w-0">
          <motion.div variants={heroItem} className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Continue sua trilha</Badge>
            {streakDays ? (
              <Badge variant="outline" className="gap-1">
                <Flame className="h-3.5 w-3.5 text-streak" aria-hidden="true" />
                {streakDays} {streakDays === 1 ? "dia" : "dias"} de sequência
              </Badge>
            ) : null}
          </motion.div>

          <motion.h2 variants={heroItem} className="text-safe mt-3 text-2xl font-semibold leading-tight tracking-tight lg:text-4xl">
            {module.title}
          </motion.h2>
          <motion.p variants={heroItem} className="mt-2.5 max-w-2xl text-sm leading-6 text-muted-foreground lg:text-base">
            {module.description}
          </motion.p>

          <motion.div variants={heroItem} className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
            <div className="flex max-w-xs flex-1 items-center gap-3">
              <Progress value={progress} className="h-2" />
              <span className="shrink-0 text-sm font-semibold">{progress}%</span>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              {remainingLessons > 0
                ? `${remainingLessons} de ${totalLessons} aulas restantes`
                : `${totalLessons} aulas concluídas`}
            </span>
          </motion.div>
        </div>

        {nextLesson ? (
          <motion.div variants={heroItem} className="shrink-0" whileHover="hover">
            <Button asChild size="lg" className="group shrink-0">
              <Link href={`/aulas/${nextLesson.id}`}>
                <PlayCircle className="h-4 w-4" aria-hidden="true" />
                {nextLesson.progress.progress_percent > 0 ? "Continuar aula" : "Começar aula"}
                <motion.span variants={{ hover: { x: 3 } }} transition={{ duration: 0.18, ease: "easeOut" }} className="inline-flex">
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </motion.span>
              </Link>
            </Button>
          </motion.div>
        ) : null}
      </motion.div>
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
