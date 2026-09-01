"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Lock, Play, Trophy } from "lucide-react";

import { ApiClientError } from "@/lib/http-client";
import { LessonPlayer } from "@/components/shared/lesson-player";
import { LoadingCard } from "@/components/shared/loading-card";
import { MotionShell } from "@/components/shared/motion-shell";
import { Surface } from "@/components/shared/premium-ui";
import { Button } from "@/components/ui/button";
import { useTrackEvent } from "@/hooks/use-track-event";
import { apiFetch, type Lesson, type Module } from "@/services/api";
import { cn } from "@/utils";

export default function LessonPage() {
  const params = useParams<{ id: string }>() ?? { id: "" };
  const trackEvent = useTrackEvent();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [completion, setCompletion] = useState<Lesson["progress"] | null>(null);
  const [nextLesson, setNextLesson] = useState<Lesson | null>(null);
  const [lockedMessage, setLockedMessage] = useState<string | null>(null);
  const [trail, setTrail] = useState<{ moduleTitle: string; lessons: Lesson[] } | null>(null);

  useEffect(() => {
    apiFetch<Lesson>(`/lessons/${params.id}`)
      .then(setLesson)
      .catch((err: unknown) => {
        if (err instanceof ApiClientError && err.code === "lesson_locked") {
          setLockedMessage(err.message);
          return;
        }
        throw err;
      });
    trackEvent({ event_type: "lesson_opened", entity_id: String(params.id), entity_type: "lesson" });
  }, [params.id, trackEvent]);

  useEffect(() => {
    apiFetch<Module[]>("/lessons/modules").then((modules) => {
      const flatLessons = modules
        .flatMap((module) => module.items ?? [])
        .filter((item) => item.kind === "lesson" && item.lesson)
        .map((item) => item.lesson as Lesson);
      const idx = flatLessons.findIndex((item) => String(item.id) === String(params.id));
      setNextLesson(idx >= 0 ? (flatLessons[idx + 1] ?? null) : null);

      const ownerModule = modules.find((module) =>
        (module.items ?? []).some((item) => item.kind === "lesson" && String(item.lesson?.id) === String(params.id)),
      );
      if (ownerModule) {
        const lessons = (ownerModule.items ?? [])
          .filter((item) => item.kind === "lesson" && item.lesson)
          .map((item) => item.lesson as Lesson);
        setTrail({ moduleTitle: ownerModule.title, lessons });
      } else {
        setTrail(null);
      }
    });
  }, [params.id]);

  async function complete() {
    if (!lesson) return;
    const progress = await apiFetch<Lesson["progress"]>(`/lessons/${lesson.id}/progress`, {
      method: "PUT",
      body: JSON.stringify({ progress_percent: 100, last_position_seconds: lesson.duration_minutes * 60, completed: true }),
    });
    setLesson({ ...lesson, progress });
    setCompletion(progress);
    trackEvent({ event_type: "lesson_completed", entity_id: String(lesson.id), entity_type: "lesson" });
  }

  if (lockedMessage) {
    return (
      <MotionShell className="space-y-4">
        <Surface className="flex flex-col items-center gap-3 py-12 text-center">
          <Lock className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <h1 className="text-xl font-semibold tracking-normal">Aula bloqueada</h1>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">{lockedMessage}</p>
          <Button asChild className="mt-2">
            <Link href="/aulas">Voltar para as aulas</Link>
          </Button>
        </Surface>
      </MotionShell>
    );
  }

  if (!lesson) return <LoadingCard />;

  return (
    <MotionShell className="space-y-5">
      {trail ? (
        <Link href="/aulas" className="inline-flex items-center gap-1.5 text-[14px] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Trilha {trail.moduleTitle}
        </Link>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,21.25rem)]">
        <LessonPlayer lesson={lesson} onComplete={complete} />

        <aside className="space-y-4 xl:sticky xl:top-28 xl:self-start">
          {trail && trail.lessons.length > 1 ? (
            <Surface>
              <TrailCard trail={trail} currentLessonId={lesson.id} />
              {nextLesson ? (
                <Link
                  href={`/aulas/${nextLesson.id}`}
                  className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-control bg-primary px-3 py-2.5 text-[14px] font-bold text-primary-foreground"
                >
                  <Play className="h-[15px] w-[15px] fill-current" aria-hidden="true" />
                  Próxima aula
                </Link>
              ) : null}
            </Surface>
          ) : null}

          {completion?.completed ? (
            <Surface>
              <div className="mb-1 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" aria-hidden="true" />
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Concluída</p>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">Aula marcada como concluída. Siga para a próxima aula.</p>
            </Surface>
          ) : null}
        </aside>
      </div>
    </MotionShell>
  );
}

/** "Nesta trilha" — navegador de aulas do módulo, fiel ao AulaPlayer.dc.html (não existia antes,
 * a sidebar só mostrava progresso/exercícios). */
function TrailCard({ trail, currentLessonId }: { trail: { moduleTitle: string; lessons: Lesson[] }; currentLessonId: number }) {
  const currentIndex = trail.lessons.findIndex((item) => item.id === currentLessonId);
  const doneCount = trail.lessons.filter((item) => item.progress.completed).length;

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <p className="text-[14px] font-semibold">Nesta trilha</p>
        <p className="text-[12px] font-semibold text-primary">
          {Math.max(currentIndex + 1, doneCount)}/{trail.lessons.length}
        </p>
      </div>
      <div className="mb-3.5 h-[5px] overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${(doneCount / trail.lessons.length) * 100}%` }} />
      </div>
      <div className="flex flex-col">
        {trail.lessons.map((item) => {
          const isCurrent = item.id === currentLessonId;
          const isDone = item.progress.completed;
          const isLocked = item.locked;
          return (
            <Link
              key={item.id}
              href={isLocked ? "#" : `/aulas/${item.id}`}
              aria-disabled={isLocked}
              className={cn(
                "flex items-center gap-2.5 rounded-[9px] px-2.5 py-2",
                isCurrent && "bg-primary/10",
                isLocked && "pointer-events-none",
              )}
            >
              <span
                className={cn(
                  "grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full",
                  isDone ? "bg-primary text-primary-foreground" : isCurrent ? "bg-primary/14 text-primary" : "bg-muted text-muted-foreground",
                )}
              >
                {isDone ? <Check className="h-3 w-3" aria-hidden="true" /> : isCurrent ? <Play className="h-2.5 w-2.5 fill-current" aria-hidden="true" /> : null}
              </span>
              <span className={cn("min-w-0 flex-1 truncate text-[13px] leading-tight", isCurrent ? "font-semibold text-foreground" : isDone ? "text-foreground/70" : "text-muted-foreground")}>
                {item.title}
              </span>
              <span className="shrink-0 text-[12px] text-muted-foreground/70">{item.duration_minutes} min</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
