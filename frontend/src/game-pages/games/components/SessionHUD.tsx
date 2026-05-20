"use client";

import { Clock, Flame, Target, Zap } from "lucide-react";

import { Progress } from "@/components/ui/progress";

export function SessionHUD({
  accuracy,
  step,
  total,
  seconds,
  streak,
}: {
  accuracy: number;
  step: number;
  total: number;
  seconds: number;
  streak: number;
}) {
  const progress = Math.round((step / Math.max(1, total)) * 100);
  return (
    <div className="game-surface bg-card p-3 md:p-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <HudMetric icon={Target} label="Precisao" value={`${accuracy}%`} />
        <HudMetric icon={Clock} label="Tempo" value={`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`} />
        <HudMetric icon={Flame} label="Streak" value={`${streak}d`} />
        <HudMetric icon={Zap} label="Etapa" value={`${step}/${total}`} />
      </div>
      <Progress value={progress} className="mt-3" />
    </div>
  );
}

function HudMetric({ icon: Icon, label, value }: { icon: typeof Target; label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/62 px-3 py-2">
      <p className="flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-secondary" aria-hidden="true" />
        {label}
      </p>
      <p className="mt-1 text-base font-semibold">{value}</p>
    </div>
  );
}
