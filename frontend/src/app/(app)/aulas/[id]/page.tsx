"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardList } from "lucide-react";

import { LessonPlayer } from "@/components/shared/lesson-player";
import { LoadingCard } from "@/components/shared/loading-card";
import { MotionShell } from "@/components/shared/motion-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch, type Lesson } from "@/services/api";

export default function LessonPage() {
  const params = useParams<{ id: string }>();
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

  return (
    <MotionShell className="space-y-5">
      <LessonPlayer lesson={lesson} onComplete={complete} />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Resumo da aula</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-7 text-muted-foreground">{lesson.summary}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exercícios vinculados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lesson.exercises.map((exercise) => (
              <div key={exercise.id} className="game-tile bg-background p-3">
                <div className="mb-2 flex items-center justify-between">
                  <Badge>{exercise.skill}</Badge>
                  <ClipboardList className="h-4 w-4 text-secondary" aria-hidden="true" />
                </div>
                <p className="text-sm text-muted-foreground">{exercise.statement}</p>
              </div>
            ))}
            {lesson.progress.completed && (
              <div className="game-tile flex items-center gap-2 bg-accent/10 p-3 text-sm font-bold text-accent">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Progresso salvo.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MotionShell>
  );
}
