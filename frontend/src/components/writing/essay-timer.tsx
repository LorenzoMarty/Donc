"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Timer as TimerIcon } from "lucide-react";

import { cn } from "@/utils";

const PRESETS_MINUTES = [40, 60, 90];

function formatClock(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Temporizador de redação — client-side, sem persistência entre sessões (reinicia ao recarregar
 * a página, igual ao resto da gamificação local). Simula o relógio da prova: escolhe um preset,
 * conta regressivamente, pausa/retoma, sem forçar envio ao zerar.
 */
export function EssayTimer({ className }: { className?: string }) {
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setRemainingSeconds((value) => {
        if (value <= 1) {
          setRunning(false);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  function start(minutes: number) {
    const seconds = minutes * 60;
    setDurationSeconds(seconds);
    setRemainingSeconds(seconds);
    setRunning(true);
  }

  function toggle() {
    if (remainingSeconds === 0) return;
    setRunning((value) => !value);
  }

  function reset() {
    setRunning(false);
    setDurationSeconds(null);
    setRemainingSeconds(0);
  }

  const timeUp = durationSeconds !== null && remainingSeconds === 0;

  if (durationSeconds === null) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <TimerIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        {PRESETS_MINUTES.map((minutes) => (
          <button
            key={minutes}
            type="button"
            onClick={() => start(minutes)}
            className="rounded-control border border-border bg-card px-2 py-0.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            {minutes}min
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-control border px-2 py-0.5 font-mono text-xs font-semibold [font-variant-numeric:tabular-nums]",
          timeUp ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-border bg-card text-foreground",
        )}
      >
        <TimerIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {timeUp ? "Tempo esgotado" : formatClock(remainingSeconds)}
      </span>
      {!timeUp && (
        <button
          type="button"
          onClick={toggle}
          aria-label={running ? "Pausar temporizador" : "Retomar temporizador"}
          className="grid h-6 w-6 shrink-0 place-items-center rounded-control border border-border bg-card text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
        >
          {running ? <Pause className="h-3.5 w-3.5" aria-hidden="true" /> : <Play className="h-3.5 w-3.5" aria-hidden="true" />}
        </button>
      )}
      <button
        type="button"
        onClick={reset}
        aria-label="Reiniciar temporizador"
        className="grid h-6 w-6 shrink-0 place-items-center rounded-control border border-border bg-card text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
