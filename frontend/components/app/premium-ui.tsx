"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Crown, Flame, Gem, Medal, Shield, Sparkles, Trophy, Zap } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex flex-col justify-between gap-4 md:flex-row md:items-end"
    >
      <div className="min-w-0">
        <div className="mb-3 inline-flex items-center gap-2 rounded-md border bg-card/72 px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-secondary" aria-hidden="true" />
          {eyebrow}
        </div>
        <h1 className="max-w-3xl text-3xl font-black tracking-normal md:text-5xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">{description}</p>}
      </div>
      {action}
    </motion.div>
  );
}

export function Surface({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.32, delay, ease: "easeOut" }}
      className={cn("glass-surface rounded-lg p-4 md:p-5", className)}
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
    primary: "bg-primary/12 text-primary",
    gold: "bg-secondary/18 text-secondary",
    accent: "bg-accent/12 text-accent",
  }[tone];

  return (
    <Surface className="min-h-[154px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-normal">{value}</p>
        </div>
        <div className={cn("rounded-lg p-2.5", toneClass)}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{helper}</p>
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
    <Surface className="relative overflow-hidden bg-primary text-primary-foreground">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.16),transparent_48%),radial-gradient(circle_at_85%_10%,rgba(201,162,39,0.28),transparent_16rem)]" />
      <div className="relative flex items-center gap-5">
        <div className="relative h-32 w-32 shrink-0">
          <svg className="h-32 w-32 -rotate-90" viewBox="0 0 132 132" aria-hidden="true">
            <circle cx="66" cy="66" r={radius} stroke="rgba(255,255,255,.18)" strokeWidth="10" fill="none" />
            <motion.circle
              cx="66"
              cy="66"
              r={radius}
              stroke="#C9A227"
              strokeWidth="10"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-xs text-white/70">Nivel</p>
              <p className="text-4xl font-black">{level}</p>
            </div>
          </div>
        </div>
        <div className="min-w-0">
          <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-white/12 px-2.5 py-1 text-xs font-semibold text-white/86">
            <Zap className="h-3.5 w-3.5 text-secondary" aria-hidden="true" />
            Ritmo ativo
          </div>
          <p className="text-3xl font-black tracking-normal">{xp} XP</p>
          <p className="mt-2 text-sm leading-6 text-white/74">Ritmo consistente desbloqueia titulos, medalhas e metas mais ambiciosas.</p>
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
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.04 }}
            className={cn(
              "grid h-11 min-w-11 place-items-center rounded-lg border text-xs font-black",
              isActive ? "border-secondary/40 bg-secondary/18 text-secondary shadow-glow" : "bg-muted/55 text-muted-foreground",
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
      className="flex gap-3 rounded-lg border bg-background/54 p-3 transition-colors hover:bg-secondary/10"
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-secondary/18 text-secondary">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold">{title}</p>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
    </motion.div>
  );
}

export function RankPodium({ xp }: { xp: number }) {
  const ranks = [
    { name: "Lia", score: xp + 420, tag: "Diamante" },
    { name: "Voce", score: xp, tag: "Ascensao" },
    { name: "Theo", score: Math.max(120, xp - 180), tag: "Ouro" },
  ];

  return (
    <div className="space-y-3">
      {ranks.map((rank, index) => (
        <motion.div
          key={rank.name}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.06 }}
          className={cn("flex items-center gap-3 rounded-lg border p-3", rank.name === "Voce" ? "bg-primary/10 border-primary/22" : "bg-background/54")}
        >
          <div className={cn("grid h-8 w-8 place-items-center rounded-md text-sm font-black", index === 0 ? "bg-secondary text-secondary-foreground" : "bg-muted")}>
            {index + 1}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{rank.name}</p>
            <p className="text-xs text-muted-foreground">{rank.tag}</p>
          </div>
          <p className="text-sm font-black">{rank.score}</p>
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
    <div className="rounded-lg border bg-background/56 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-muted-foreground">{label}</span>
        <span className="text-sm font-black">{value}</span>
      </div>
      <Progress value={(value / 200) * 100} className="h-2" />
    </div>
  );
}
