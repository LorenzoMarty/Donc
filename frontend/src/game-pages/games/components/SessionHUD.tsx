"use client";

import { Clock, Flame, Route, Zap, type LucideIcon } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { formatMMSS } from "@/utils";

export function SessionHUD({
  accuracy,
  step,
  total,
  seconds,
  streak,
  xp,
}: {
  accuracy: number;
  step: number;
  total: number;
  seconds: number;
  streak: number;
  xp?: number;
}) {
  const progress = Math.round((step / Math.max(1, total)) * 100);
  return (
    <div className="game-surface bg-card p-3 md:p-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:gap-3">
        <HudMetric icon={Zap} label="XP" value={xp ? `+${xp}` : `${accuracy}%`} />
        <HudMetric icon={Route} label="Progresso" value={`${step}/${total}`} />
        <HudMetric icon={Flame} label="Combo" value={`${streak}x`} />
        <HudMetric icon={Clock} label="Tempo" value={formatMMSS(seconds)} />
      </div>
      <Progress value={progress} className="mt-3" />
    </div>
  );
}

function HudMetric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-background/62 px-2.5 py-2 xs:px-3">
      <p className="flex items-center gap-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        {label}
      </p>
      <p className="text-safe mt-1 text-base font-semibold">{value}</p>
    </div>
  );
}
