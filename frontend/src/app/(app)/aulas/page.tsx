"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BookOpen, Layers, Play, Quote, Target, type LucideIcon } from "lucide-react";

import { ErrorState } from "@/components/shared/error-state";
import { LoadingCard } from "@/components/shared/loading-card";
import { MotionShell } from "@/components/shared/motion-shell";
import { PageHeader } from "@/components/shared/premium-ui";
import { apiFetch, type Lesson, type Module } from "@/services/api";
import { cn } from "@/utils";

const TRACK_ICONS: LucideIcon[] = [BookOpen, Layers, Target, Quote];

/** Tinge de fundo suave a partir da cor do módulo — só funciona pra hex (`#rrggbb`); fallback sólido caso contrário. */
function tintBackground(color: string): string {
  return color.startsWith("#") ? `${color}1f` : "hsl(var(--primary) / 0.12)";
}

export default function LessonsPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadModules = useCallback(() => {
    return apiFetch<Module[]>("/lessons/modules")
      .then((modulesData) => {
        setModules(modulesData);
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

  const allLessons = modules.flatMap((mod) => mod.lessons ?? []);
  const continuing = allLessons.find((lesson) => lesson.progress.progress_percent > 0 && !lesson.progress.completed);
  const continuingModule = continuing ? modules.find((mod) => mod.lessons?.some((lesson) => lesson.id === continuing.id)) : null;
  const recentLessons = [...allLessons].sort((a, b) => b.order - a.order).slice(0, 6);

  return (
    <MotionShell className="space-y-6">
      <PageHeader
        eyebrow="Aulas"
        title="Escolha o que assistir"
        description="Aprenda a estruturar a redação nota 1000"
      />

      {continuing && continuingModule ? <ContinueBanner lesson={continuing} module={continuingModule} /> : null}

      <div>
        <h2 className="mb-3.5 text-[17px] font-semibold">Trilhas de aprendizado</h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
          {modules.map((module, index) => (
            <TrackCard key={module.id} module={module} icon={TRACK_ICONS[index % TRACK_ICONS.length]} />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="text-[17px] font-semibold">Aulas recentes</h2>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
          {recentLessons.map((lesson) => {
            const lessonModule = modules.find((item) => item.lessons?.some((l) => l.id === lesson.id));
            return (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                moduleTitle={lessonModule?.title ?? ""}
                tint={lessonModule?.color || "hsl(var(--primary))"}
              />
            );
          })}
        </div>
      </div>
    </MotionShell>
  );
}

function ContinueBanner({ lesson, module }: { lesson: Lesson; module: Module }) {
  const remainingMinutes = Math.max(1, Math.round(lesson.duration_minutes * (1 - lesson.progress.progress_percent / 100)));

  return (
    <div className="flex items-center gap-8 rounded-[20px] bg-[hsl(var(--accent-900))] p-7 text-white">
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8ee0a3]">Continue assistindo</p>
        <p className="font-display mt-1.5 text-[27px] font-medium leading-tight">{lesson.title}</p>
        <p className="text-[14px] text-white/70">
          {module.title} · Aula {lesson.order} de {module.lessons.length}
        </p>
        <div className="mt-4.5 flex items-center gap-3.5">
          <Link
            href={`/aulas/${lesson.id}`}
            className="flex items-center gap-2 rounded-control bg-white px-[22px] py-3 text-[14px] font-bold text-[hsl(var(--accent-900))]"
          >
            <Play className="h-4 w-4 fill-current" aria-hidden="true" />
            Retomar aula
          </Link>
          <div className="max-w-[260px] flex-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-primary" style={{ width: `${lesson.progress.progress_percent}%` }} />
            </div>
            <p className="mt-1.5 text-[12px] text-white/60">
              {lesson.progress.progress_percent}% concluído · restam {remainingMinutes} min
            </p>
          </div>
        </div>
      </div>
      <Link
        href={`/aulas/${lesson.id}`}
        className="grid h-[132px] w-[220px] shrink-0 place-items-center rounded-[14px] bg-primary shadow-elevated"
      >
        <span className="grid h-[52px] w-[52px] place-items-center rounded-full bg-white/90">
          <Play className="h-5 w-5 fill-[hsl(var(--accent-900))] text-[hsl(var(--accent-900))]" aria-hidden="true" />
        </span>
      </Link>
    </div>
  );
}

function TrackCard({ module, icon: Icon }: { module: Module; icon: LucideIcon }) {
  const tint = module.color || "hsl(var(--primary))";
  return (
    <div className="rounded-card bg-card p-5 shadow-soft">
      <div className="grid h-11 w-11 place-items-center rounded-control" style={{ backgroundColor: tintBackground(tint) }}>
        <Icon className="h-5 w-5" style={{ color: tint }} aria-hidden="true" />
      </div>
      <p className="mt-3.5 text-[15px] font-semibold leading-tight">{module.title}</p>
      <p className="mt-1 text-[12px] text-muted-foreground">{module.lessons?.length ?? 0} aulas</p>
      <div className="mt-3.5 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full" style={{ width: `${module.progress_percent}%`, backgroundColor: tint }} />
        </div>
        <span className="text-[12px] font-semibold tabular-nums text-muted-foreground">{module.progress_percent}%</span>
      </div>
    </div>
  );
}

function LessonCard({ lesson, moduleTitle, tint }: { lesson: Lesson; moduleTitle: string; tint: string }) {
  const watched = lesson.progress.progress_percent > 0;

  return (
    <Link href={`/aulas/${lesson.id}`} className="block overflow-hidden rounded-card bg-card shadow-soft">
      <div className="relative flex h-32 items-center justify-center" style={{ backgroundColor: tint }}>
        <span className="grid h-[46px] w-[46px] place-items-center rounded-full bg-white/90">
          <Play className="h-[18px] w-[18px] fill-[#1c1c1e] text-[#1c1c1e]" aria-hidden="true" />
        </span>
        <span className="absolute bottom-2 right-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-semibold text-white">
          {lesson.duration_minutes}:00
        </span>
        {watched ? (
          <span className="absolute inset-x-0 bottom-0 h-1 bg-black/25">
            <span className="block h-full bg-primary" style={{ width: `${lesson.progress.progress_percent}%` }} />
          </span>
        ) : null}
      </div>
      <div className="p-4">
        <span
          className={cn("inline-block rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.03em]")}
          style={{ color: tint, backgroundColor: tintBackground(tint) }}
        >
          {moduleTitle}
        </span>
        <p className="mt-2 text-[14px] font-semibold leading-tight">{lesson.title}</p>
      </div>
    </Link>
  );
}
