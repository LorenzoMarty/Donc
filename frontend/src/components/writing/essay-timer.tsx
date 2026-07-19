"use client";

import { useEffect, useState } from "react";
import { Timer as TimerIcon } from "lucide-react";

import { cn } from "@/utils";

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Cronômetro de redação — conta o tempo gasto desde que o rascunho foi aberto, sem presets nem
 * controles manuais. Client-side, sem persistência entre sessões (reinicia ao recarregar a
 * página, igual ao resto da gamificação local).
 */
export function EssayTimer({ className }: { className?: string }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsedSeconds((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-control border border-border bg-card px-2 py-0.5 font-mono text-xs font-semibold text-foreground [font-variant-numeric:tabular-nums]",
        className,
      )}
      title="Tempo gasto nesta redação"
    >
      <TimerIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      {formatClock(elapsedSeconds)}
    </span>
  );
}
