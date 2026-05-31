"use client";

import { motion } from "framer-motion";
import { Flame, Medal, Shield, Trophy, Zap } from "lucide-react";

import { getRankSnapshot } from "@/features/xp/xp";
import { useGameStore } from "@/stores/game-store";

export function ProgressDashboard({ overallProgress, weeklyProgress }: { overallProgress: number; weeklyProgress: number }) {
  const xp = useGameStore((state) => state.xp);
  const streak = useGameStore((state) => state.streak);
  const rank = getRankSnapshot(xp);

  const metrics = [
    { label: "Rank atual", value: rank.current.name, icon: Shield },
    { label: "XP total", value: `${xp} pts`, icon: Zap },
    { label: "Streak diaria", value: `${streak.current} dias`, icon: Flame },
    { label: "Proximo rank", value: rank.next?.name ?? "Topo", icon: Trophy },
    { label: "Progresso semanal", value: `${weeklyProgress}%`, icon: Medal },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: "easeOut" }}
      className="game-surface relative overflow-hidden bg-card p-4 md:p-5 lg:p-6"
    >
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-primary/45" aria-hidden="true" />
      <div className="fluid-grid gap-3 md:gap-4 [--grid-min:11rem]">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.07 + index * 0.045, duration: 0.28, ease: "easeOut" }}
              className="game-tile bg-background/58 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{metric.label}</p>
                  <p className="mt-2 text-lg font-semibold tracking-normal text-foreground">{metric.value}</p>
                </div>
                <div className="grid h-9 w-9 place-items-center rounded-md border border-primary/25 bg-primary/12 text-primary">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-5 grid gap-4 md:mt-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="mb-2 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/90">Barra de XP</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {rank.next ? `${rank.xpToNext} XP ate ${rank.next.name}.` : "Rank maximo alcancado."}
              </p>
            </div>
            <span className="game-chip bg-primary/12 px-3 py-1 text-xs font-semibold text-primary">{rank.progress}%</span>
          </div>
          <div className="relative h-3 overflow-hidden rounded-full border border-border bg-muted/70 shadow-inner">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${rank.progress}%` }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="relative h-full rounded-full bg-primary"
              style={{ filter: "drop-shadow(0 0 12px hsl(var(--primary) / 0.28))" }}
            />
          </div>
        </div>

        <div className="game-tile bg-background/58 px-4 py-3 text-left lg:text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Dominio geral</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{overallProgress}%</p>
        </div>
      </div>
    </motion.section>
  );
}
