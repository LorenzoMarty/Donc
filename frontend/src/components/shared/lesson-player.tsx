"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, FileText, Play, PlayCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Lesson } from "@/services/api";

export function LessonPlayer({ lesson, onComplete }: { lesson: Lesson; onComplete: () => void }) {
  const youtubeId = lesson.video_url ? extractYouTubeId(lesson.video_url) : null;

  return (
    <div className="game-surface overflow-hidden bg-card">
      <div className="aspect-video overflow-hidden rounded-card border-b border-border bg-foreground">
        {youtubeId ? (
          <CustomYouTubePlayer videoId={youtubeId} title={lesson.title} />
        ) : lesson.video_url ? (
          <iframe className="h-full w-full" src={lesson.video_url} title={lesson.title} allowFullScreen />
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
            </div>
            <h1 className="font-display text-3xl font-medium leading-tight tracking-tight">{lesson.title}</h1>
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

function extractYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return parsed.pathname.slice(1) || null;
    if (!parsed.hostname.includes("youtube.com")) return null;
    const fromQuery = parsed.searchParams.get("v");
    if (fromQuery) return fromQuery;
    const embedMatch = parsed.pathname.match(/\/embed\/([^/?]+)/);
    return embedMatch ? embedMatch[1] : null;
  } catch {
    return null;
  }
}

type YTPlayerInstance = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        config: {
          videoId: string;
          playerVars: Record<string, number>;
          events: {
            onReady: () => void;
            onStateChange: (event: { data: number }) => void;
          };
        },
      ) => YTPlayerInstance;
      PlayerState: { PLAYING: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<void> | null = null;

/** Carrega a IFrame API do YouTube uma única vez (compartilhada entre montagens do player). */
function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
    }
  });
  return youtubeApiPromise;
}

function formatClock(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Overlay customizado (botão play central, barra de progresso verde, tempo) sobre o player real
 * do YouTube — via IFrame API (`controls:0`), fiel ao AulaPlayer.dc.html. Sem isso, o player
 * mostraria o chrome nativo do YouTube, divergindo do mock.
 */
function CustomYouTubePlayer({ videoId, title }: { videoId: string; title: string }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let ready = false;
    let poll: number | undefined;

    loadYouTubeApi().then(() => {
      if (cancelled || !mountRef.current || !window.YT) return;
      const player = new window.YT.Player(mountRef.current, {
        videoId,
        playerVars: { controls: 0, disablekb: 1, modestbranding: 1, rel: 0, iv_load_policy: 3 },
        events: {
          onReady: () => {
            if (cancelled) return;
            ready = true;
            setDuration(player.getDuration());
            poll = window.setInterval(() => {
              if (!playerRef.current) return;
              setCurrentTime(playerRef.current.getCurrentTime());
              setDuration((prev) => playerRef.current?.getDuration() || prev);
            }, 500);
          },
          onStateChange: (event) => {
            if (cancelled || !ready) return;
            setPlaying(event.data === window.YT?.PlayerState.PLAYING);
          },
        },
      });
      playerRef.current = player;
    });

    return () => {
      cancelled = true;
      if (poll) window.clearInterval(poll);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoId]);

  const percent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  function togglePlay() {
    if (!playerRef.current) return;
    if (playing) {
      playerRef.current.pauseVideo();
      setPlaying(false);
    } else {
      playerRef.current.playVideo();
      setPlaying(true);
    }
  }

  function seekToPercent(event: React.MouseEvent<HTMLDivElement>) {
    if (!playerRef.current || !duration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    playerRef.current.seekTo(fraction * duration, true);
    setCurrentTime(fraction * duration);
  }

  return (
    <div className="relative h-full w-full bg-[#111]">
      <div ref={mountRef} className="pointer-events-none absolute inset-0 h-full w-full" title={title} />

      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? "Pausar" : "Reproduzir"}
        className="absolute inset-0 flex items-center justify-center bg-transparent"
      >
        {!playing ? (
          <span className="grid h-[76px] w-[76px] place-items-center rounded-full bg-white/95 shadow-[0_10px_30px_-8px_rgba(0,0,0,.6)]">
            <Play className="ml-0.5 h-7 w-7 fill-[#111] text-[#111]" aria-hidden="true" />
          </span>
        ) : null}
      </button>

      <div className="absolute inset-x-0 bottom-0 px-5 py-4" onClick={(event) => event.stopPropagation()}>
        <div
          role="slider"
          aria-label="Progresso do vídeo"
          aria-valuenow={Math.round(percent)}
          onClick={seekToPercent}
          className="h-[5px] cursor-pointer overflow-hidden rounded-[3px] bg-white/25"
        >
          <div className="h-full rounded-[3px] bg-primary" style={{ width: `${percent}%` }} />
        </div>
        <div className="mt-2.5 flex items-center justify-between text-[13px] text-white/85">
          <span className="tabular-nums">
            {formatClock(currentTime)} / {formatClock(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
