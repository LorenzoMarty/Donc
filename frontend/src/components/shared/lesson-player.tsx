"use client";

import { CheckCircle2, Download, FileText, PlayCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Lesson } from "@/services/api";

/**
 * YouTube deixa a marca vermelho/branco do próprio player vazar pro iframe por padrão. Esses
 * parâmetros reduzem isso: sem logo do YouTube, sem sugestões de outros canais ao pausar/terminar,
 * barra de progresso branca (neutra) em vez de vermelha.
 */
function withPlayerParams(url: string): string {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("youtube.com") && !parsed.hostname.includes("youtu.be")) return url;
    parsed.searchParams.set("modestbranding", "1");
    parsed.searchParams.set("rel", "0");
    parsed.searchParams.set("color", "white");
    parsed.searchParams.set("iv_load_policy", "3");
    return parsed.toString();
  } catch {
    return url;
  }
}

export function LessonPlayer({ lesson, onComplete }: { lesson: Lesson; onComplete: () => void }) {
  return (
    <div className="game-surface overflow-hidden bg-card">
      <div className="aspect-video overflow-hidden rounded-card border-b border-border bg-foreground">
        {lesson.video_url ? (
          <iframe className="h-full w-full" src={withPlayerParams(lesson.video_url)} title={lesson.title} allowFullScreen />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-background/70">
            <FileText className="h-8 w-8" aria-hidden="true" />
            <p className="text-sm font-semibold">Esta aula é em PDF, sem vídeo</p>
          </div>
        )}
      </div>
      <div className="space-y-4 p-4 xs:p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{lesson.duration_minutes} min</Badge>
              <Badge variant="secondary">{lesson.xp_reward ?? 25}xp</Badge>
            </div>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight">{lesson.title}</h1>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            {lesson.pdf_url ? (
              <Button asChild variant="outline" className="w-full md:w-auto">
                <a href={lesson.pdf_url} download target="_blank" rel="noopener">
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Baixar PDF
                </a>
              </Button>
            ) : null}
            <Button onClick={onComplete} variant={lesson.progress.completed ? "secondary" : "default"} className="w-full md:w-auto">
              {lesson.progress.completed ? (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              ) : (
                <PlayCircle className="h-4 w-4" aria-hidden="true" />
              )}
              {lesson.progress.completed ? "Concluida" : "Marcar concluida"}
            </Button>
          </div>
        </div>
        <Progress value={lesson.progress.progress_percent} />
      </div>
    </div>
  );
}
