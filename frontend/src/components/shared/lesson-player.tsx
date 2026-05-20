"use client";

import { CheckCircle2, PlayCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Lesson } from "@/services/api";

export function LessonPlayer({
  lesson,
  onComplete,
}: {
  lesson: Lesson;
  onComplete: () => void;
}) {
  return (
    <div className="game-surface overflow-hidden bg-card">
      <div className="aspect-video border-b border-border bg-foreground">
        <iframe className="h-full w-full" src={lesson.video_url} title={lesson.title} allowFullScreen />
      </div>
      <div className="space-y-4 p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-bold text-muted-foreground">{lesson.duration_minutes} min</p>
            <h1 className="text-2xl font-semibold tracking-normal">{lesson.title}</h1>
          </div>
          <Button onClick={onComplete} variant={lesson.progress.completed ? "secondary" : "default"}>
            {lesson.progress.completed ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <PlayCircle className="h-4 w-4" aria-hidden="true" />}
            {lesson.progress.completed ? "Concluída" : "Marcar concluída"}
          </Button>
        </div>
        <Progress value={lesson.progress.progress_percent} />
      </div>
    </div>
  );
}
