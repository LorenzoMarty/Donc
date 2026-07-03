"use client";

import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Clock, PlayCircle, Zap } from "lucide-react";

import { cn } from "@/utils";

/** Dados mínimos pra renderizar um poster — deliberadamente mais magro que `Lesson` completo,
 * porque os rails do dashboard (`recent_lessons`/`suggested_lessons`) só trazem esse subconjunto. */
export type LessonPosterInfo = {
  id: number | string;
  title: string;
  href: string;
  thumbnailUrl?: string;
  progressPercent?: number;
  completed?: boolean;
  durationMinutes?: number;
  xpReward?: number;
  moduleLabel?: string;
  /** Semente pro fallback ilustrado quando não há imagem real (título/módulo, algo estável). */
  fallbackSeed?: string;
};

const FALLBACK_ACCENTS = [
  "hsl(215 100% 61%)",
  "hsl(134 61% 41%)",
  "hsl(354 70% 54%)",
  "hsl(28 90% 52%)",
  "hsl(262 60% 55%)",
  "hsl(190 80% 40%)",
];

function accentForSeed(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return FALLBACK_ACCENTS[hash % FALLBACK_ACCENTS.length];
}

function hasRealThumbnail(url?: string): url is string {
  return !!url && !url.endsWith("default.jpg");
}

/** Card "poster" estilo streaming: imagem (ou fallback ilustrado), sliver de progresso, badges. */
export function LessonPosterCard({ lesson, className }: { lesson: LessonPosterInfo; className?: string }) {
  const withImage = hasRealThumbnail(lesson.thumbnailUrl);
  const accent = accentForSeed(lesson.fallbackSeed ?? lesson.title);
  const progress = Math.max(0, Math.min(100, lesson.progressPercent ?? 0));

  return (
    <Link
      href={lesson.href}
      className={cn("game-tile group relative w-60 shrink-0 snap-start overflow-hidden bg-card sm:w-72", className)}
    >
      <div className="relative aspect-video overflow-hidden">
        {withImage ? (
          <Image
            src={lesson.thumbnailUrl!}
            alt=""
            fill
            sizes="(min-width: 640px) 18rem, 15rem"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0" style={{ backgroundColor: accent }} aria-hidden="true">
            <div className="absolute inset-0 bg-foreground/15" />
            <div className="absolute -bottom-8 left-4 h-20 w-20 rotate-45 rounded-2xl border border-background/25 bg-background/10" />
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/85 via-foreground/20 to-transparent p-3 pt-8">
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-background">{lesson.title}</p>
          {lesson.moduleLabel ? <p className="mt-0.5 truncate text-xs text-background/75">{lesson.moduleLabel}</p> : null}
        </div>

        <span
          className={cn(
            "absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full transition-opacity",
            lesson.completed ? "bg-primary text-primary-foreground" : "bg-background/80 text-foreground opacity-0 group-hover:opacity-100",
          )}
        >
          {lesson.completed ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <PlayCircle className="h-4 w-4" aria-hidden="true" />}
        </span>

        {progress > 0 && !lesson.completed ? (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-background/40" aria-hidden="true">
            <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
          </div>
        ) : null}
      </div>

      {(lesson.durationMinutes != null || lesson.xpReward != null) && (
        <div className="flex items-center gap-2 p-2.5 text-xs text-muted-foreground">
          {lesson.durationMinutes != null ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {lesson.durationMinutes} min
            </span>
          ) : null}
          {lesson.xpReward != null ? (
            <span className="ml-auto inline-flex items-center gap-1">
              <Zap className="h-3 w-3 text-primary" aria-hidden="true" />
              {lesson.xpReward}xp
            </span>
          ) : null}
        </div>
      )}
    </Link>
  );
}
