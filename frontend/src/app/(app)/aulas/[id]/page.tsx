"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardList, FileText, NotebookPen, Trophy, Zap } from "lucide-react";

import { LessonPlayer } from "@/components/shared/lesson-player";
import { LoadingCard } from "@/components/shared/loading-card";
import { MotionShell } from "@/components/shared/motion-shell";
import { Surface } from "@/components/shared/premium-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/providers/app-providers";
import { useTrackEvent } from "@/hooks/use-track-event";
import { apiFetch, type Lesson } from "@/services/api";

export default function LessonPage() {
  const params = useParams<{ id: string }>() ?? { id: "" };
  const { refresh } = useAuth();
  const trackEvent = useTrackEvent();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [completion, setCompletion] = useState<Lesson["progress"] | null>(null);

  useEffect(() => {
    apiFetch<Lesson>(`/lessons/${params.id}`).then(setLesson);
    trackEvent({ event_type: "lesson_opened", entity_id: String(params.id), entity_type: "lesson" });
  }, [params.id, trackEvent]);

  async function complete() {
    if (!lesson) return;
    const progress = await apiFetch<Lesson["progress"]>(`/lessons/${lesson.id}/progress`, {
      method: "PUT",
      body: JSON.stringify({ progress_percent: 100, last_position_seconds: lesson.duration_minutes * 60, completed: true }),
    });
    setLesson({ ...lesson, progress });
    setCompletion(progress);
    trackEvent({ event_type: "lesson_completed", entity_id: String(lesson.id), entity_type: "lesson" });
    if ((progress.xp_earned ?? 0) > 0) {
      await refresh();
    }
  }

  if (!lesson) return <LoadingCard />;

  const summaryParts = splitSummary(lesson.summary);

  return (
    <MotionShell className="space-y-5">
      <LessonPlayer lesson={lesson} onComplete={complete} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,21.25rem)]">
        <main className="min-w-0 space-y-4">
          <Surface>
            <div className="mx-auto max-w-[76ch]">
              <div className="mb-5 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Resumo da aula</p>
              </div>
              <div className="space-y-4 text-[15px] leading-8 text-muted-foreground sm:text-base">
                {summaryParts.map((part) => (
                  <p key={part}>{part}</p>
                ))}
              </div>
            </div>
          </Surface>

          <Surface>
            <div className="mx-auto max-w-[76ch]">
              <div className="mb-4 flex items-center gap-2">
                <NotebookPen className="h-4 w-4 text-primary" aria-hidden="true" />
                <h2 className="text-xl font-semibold tracking-normal">Anotacoes</h2>
              </div>
              <textarea
                className="min-h-44 w-full resize-y rounded-md border border-input bg-card/90 p-4 text-base leading-7 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-ring/15 md:text-sm"
                placeholder="Registre tese, repertorios, exemplos e duvidas para revisar depois."
              />
            </div>
          </Surface>
        </main>

        <aside className="space-y-4 xl:sticky xl:top-28 xl:self-start">
          {completion ? (
            <Surface>
              <div className="mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" aria-hidden="true" />
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Recompensa</p>
              </div>
              <p className="text-3xl font-semibold tracking-normal">+{completion.xp_earned ?? 0} XP</p>
              <div className="mt-3 space-y-2">
                {completion.reward_events?.length ? (
                  completion.reward_events.map((event) => (
                    <div key={event} className="rounded-md border border-border bg-background/58 p-2 text-sm text-muted-foreground">
                      {event}
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-muted-foreground">O XP desta conclusao ja estava registrado.</p>
                )}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Rank atual: <span className="font-semibold text-foreground">{completion.rank_name ?? "Aprendiz"}</span>
              </p>
            </Surface>
          ) : null}

          <Surface>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Progresso</p>
            <p className="mt-2 text-2xl font-semibold">{lesson.progress.progress_percent}%</p>
            <Progress value={lesson.progress.progress_percent} className="mt-4" />
            <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-border bg-background/58 p-3 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
                XP da aula
              </span>
              <span className="font-semibold">{lesson.xp_reward ?? 25}xp</span>
            </div>
            <Button onClick={complete} variant={lesson.progress.completed ? "secondary" : "default"} className="mt-4 w-full">
              {lesson.progress.completed ? (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ClipboardList className="h-4 w-4" aria-hidden="true" />
              )}
              {lesson.progress.completed ? "Aula concluida" : "Marcar como concluida"}
            </Button>
          </Surface>

          <Surface>
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Exercicios relacionados</p>
              <h2 className="mt-1 text-xl font-semibold tracking-normal">Pratica de fixacao</h2>
            </div>
            <div className="space-y-3">
              {lesson.exercises.length ? (
                lesson.exercises.map((exercise) => (
                  <div key={exercise.id} className="game-tile bg-background/58 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <Badge variant="outline">{exercise.skill}</Badge>
                      <Badge variant="secondary">{difficultyLabel(exercise.difficulty)}</Badge>
                    </div>
                    <p className="text-safe text-sm leading-6 text-muted-foreground">{exercise.statement}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">Nenhum exercicio liberado para esta aula no rank atual.</p>
              )}
            </div>
          </Surface>
        </aside>
      </div>
    </MotionShell>
  );
}

function difficultyLabel(value: string) {
  if (value === "hard") return "avancado";
  if (value === "medium") return "intermediario";
  return "essencial";
}

function splitSummary(summary: string) {
  const parts = summary
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length > 1) return parts;
  return summary.split(/(?<=\.)\s+/).reduce<string[]>((acc, sentence) => {
    const last = acc.at(-1);
    if (!last || last.length > 220) return [...acc, sentence];
    return [...acc.slice(0, -1), `${last} ${sentence}`];
  }, []);
}
