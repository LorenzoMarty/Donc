"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardList, FileText, NotebookPen } from "lucide-react";

import { LessonPlayer } from "@/components/shared/lesson-player";
import { LoadingCard } from "@/components/shared/loading-card";
import { MotionShell } from "@/components/shared/motion-shell";
import { Surface } from "@/components/shared/premium-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { apiFetch, type Lesson } from "@/services/api";

export default function LessonPage() {
  const params = useParams<{ id: string }>() ?? { id: "" };
  const [lesson, setLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    apiFetch<Lesson>(`/lessons/${params.id}`).then(setLesson);
  }, [params.id]);

  async function complete() {
    if (!lesson) return;
    const progress = await apiFetch<Lesson["progress"]>(`/lessons/${lesson.id}/progress`, {
      method: "PUT",
      body: JSON.stringify({ progress_percent: 100, last_position_seconds: lesson.duration_minutes * 60, completed: true }),
    });
    setLesson({ ...lesson, progress });
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
                <FileText className="h-4 w-4 text-secondary" aria-hidden="true" />
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
                <NotebookPen className="h-4 w-4 text-secondary" aria-hidden="true" />
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
          <Surface>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Progresso</p>
            <p className="mt-2 text-2xl font-semibold">{lesson.progress.progress_percent}%</p>
            <Progress value={lesson.progress.progress_percent} className="mt-4" />
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
              {lesson.exercises.map((exercise) => (
                <div key={exercise.id} className="game-tile bg-background/58 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Badge variant="outline">{exercise.skill}</Badge>
                    <ClipboardList className="h-4 w-4 text-secondary" aria-hidden="true" />
                  </div>
                  <p className="text-safe text-sm leading-6 text-muted-foreground">{exercise.statement}</p>
                </div>
              ))}
            </div>
          </Surface>
        </aside>
      </div>
    </MotionShell>
  );
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
