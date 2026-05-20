"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { BookOpenCheck, Crown, Flame, Gem, Medal, Shield, Trophy, Zap } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="game-surface relative overflow-hidden bg-card p-5 md:p-6"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/55 to-transparent" aria-hidden="true" />
      <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div className="min-w-0">
          <div className="game-chip mb-4 inline-flex items-center gap-2 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-secondary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
            {eyebrow}
          </div>
          <div className="flex items-start gap-3">
            <div className="hidden h-10 w-10 shrink-0 place-items-center rounded-md border border-primary/20 bg-primary/10 text-secondary sm:grid">
              <BookOpenCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="max-w-3xl text-2xl font-semibold leading-tight tracking-normal sm:text-3xl">{title}</h1>
              {description && <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-muted-foreground md:text-base">{description}</p>}
            </div>
          </div>
        </div>
        {action && <div className="w-full shrink-0 md:w-auto">{action}</div>}
      </div>
    </motion.div>
  );
}

export function Surface({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const solidPrimary = className?.split(/\s+/).includes("bg-primary");

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.24, delay, ease: "easeOut" }}
      className={cn(solidPrimary ? "game-surface bg-primary p-5 text-primary-foreground md:p-6" : "game-surface bg-card p-4 md:p-5", className)}
    >
      {children}
    </motion.section>
  );
}

export function StatTile({
  label,
  value,
  helper,
  icon: Icon,
  progress,
  tone = "primary",
}: {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  progress?: number;
  tone?: "primary" | "gold" | "accent";
}) {
  const toneClass = {
    primary: "bg-primary/12 text-secondary",
    gold: "bg-accent/22 text-accent-foreground",
    accent: "bg-secondary/10 text-secondary",
  }[tone];

  return (
    <Surface className="min-h-[154px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-normal">{value}</p>
        </div>
        <div className={cn("grid h-11 w-11 place-items-center rounded-md border border-border p-2.5 shadow-sm", toneClass)}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{helper}</p>
      {progress !== undefined && <Progress value={progress} className="mt-4 h-2.5" />}
    </Surface>
  );
}

export function XpRing({
  level,
  xp,
  progress,
}: {
  level: number;
  xp: number;
  progress: number;
}) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference;

  return (
    <Surface className="relative overflow-hidden">
      <div className="relative flex items-center gap-5">
        <div className="relative h-32 w-32 shrink-0">
          <svg className="h-32 w-32 -rotate-90" viewBox="0 0 132 132" aria-hidden="true">
            <circle cx="66" cy="66" r={radius} stroke="hsl(var(--muted))" strokeWidth="10" fill="none" />
            <motion.circle
              cx="66"
              cy="66"
              r={radius}
              stroke="hsl(var(--primary))"
              strokeWidth="10"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-xs text-muted-foreground">Consistencia</p>
              <p className="text-4xl font-semibold">{level}</p>
            </div>
          </div>
        </div>
        <div className="min-w-0">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-primary/10 px-2.5 py-1 text-xs font-semibold text-secondary">
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
            Progressao secundaria
          </div>
          <p className="text-3xl font-semibold tracking-normal">{xp} pts</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Pontos existem apenas como reforco. O foco principal e frequencia, revisao e melhora por competencia.</p>
        </div>
      </div>
    </Surface>
  );
}

export function StreakStrip({ days }: { days: number }) {
  const active = Math.min(7, Math.max(0, days));
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
      {Array.from({ length: 7 }, (_, index) => {
        const isActive = index < active;
        return (
          <motion.div
            key={index}
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.035 }}
            className={cn(
              "grid h-11 min-w-11 place-items-center rounded-md border border-border text-xs font-semibold shadow-sm",
              isActive ? "bg-primary text-primary-foreground" : "bg-muted/55 text-muted-foreground",
            )}
          >
            {isActive ? <Flame className="h-4 w-4" aria-hidden="true" /> : index + 1}
          </motion.div>
        );
      })}
    </div>
  );
}

export function AchievementChip({
  title,
  description,
  index,
}: {
  title: string;
  description: string;
  index: number;
}) {
  const icons = [Trophy, Medal, Gem, Shield, Crown];
  const Icon = icons[index % icons.length];
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="game-tile flex gap-3 bg-background/54 p-3 transition-colors hover:bg-muted/70"
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-primary/20 bg-primary/10 text-secondary shadow-sm">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
    </motion.div>
  );
}

export function RankPodium({ xp }: { xp: number }) {
  const ranks = [
    { name: "Lia", score: xp + 420, tag: "Consistencia alta" },
    { name: "Voce", score: xp, tag: "Evolucao ativa" },
    { name: "Theo", score: Math.max(120, xp - 180), tag: "Rotina estavel" },
  ];

  return (
    <div className="space-y-3">
      {ranks.map((rank, index) => (
        <motion.div
          key={rank.name}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.06 }}
          className={cn("game-tile flex items-center gap-3 p-3", rank.name === "Voce" ? "bg-primary/8" : "bg-background/54")}
        >
          <div className={cn("grid h-8 w-8 place-items-center rounded-md border border-border text-sm font-semibold", index === 0 ? "bg-primary text-primary-foreground" : "bg-muted")}>
            {index + 1}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{rank.name}</p>
            <p className="text-xs text-muted-foreground">{rank.tag}</p>
          </div>
          <p className="text-sm font-semibold">{rank.score}</p>
        </motion.div>
      ))}
    </div>
  );
}

export function CompetencyMeter({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="game-tile bg-background/56 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold">{value}</span>
      </div>
      <Progress value={(value / 200) * 100} className="h-2" />
    </div>
  );
}
