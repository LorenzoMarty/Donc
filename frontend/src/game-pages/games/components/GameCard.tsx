"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Clock, Gamepad2, Lock, Sparkles, Timer, Trophy, Zap } from "lucide-react";

import type { GameDefinition, GameProgress } from "@/features/gamification/types";
import { getCategoryBySlug } from "@/features/gamification/catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils";

type GameCardVariant = "default" | "compact";

type GameCardProps = {
  game: GameDefinition;
  progress?: GameProgress;
  variant?: GameCardVariant;
  index?: number;
  className?: string;
};

function GameCard({ game, progress, variant = "default", index = 0, className }: GameCardProps) {
  const category = getCategoryBySlug(game.category);
  const Icon = category?.icon ?? Gamepad2;
  const value = progress?.progress ?? game.progress;

  return (
    <motion.article
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.035, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{
        y: -6,
        scale: 1.015,
        boxShadow: "0 22px 54px rgba(20,30,55,.12), 0 0 0 1px hsl(var(--primary) / .36)",
      }}
      whileTap={{ scale: 0.985 }}
      className={cn(
        "game-surface group relative flex h-full min-w-0 flex-col overflow-hidden bg-card text-foreground transition-colors duration-300 hover:border-primary/45",
        variant === "compact" ? "p-3" : "p-4",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute right-0 top-0 h-40 w-40 translate-x-1/3 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden="true"
      />

      <GameThumbnail
        game={game}
        icon={<Icon className="h-6 w-6" aria-hidden="true" />}
        accent={category?.secondaryColor ?? "hsl(var(--primary))"}
        compact={variant === "compact"}
      />

      <div className="mt-4 flex flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border-primary/20 bg-primary/10 text-primary">{category?.name ?? game.category}</Badge>
        </div>

        <div className="mt-3">
          <h3 className={cn("font-semibold tracking-normal text-foreground", variant === "compact" ? "text-lg" : "text-xl")}>
            {game.name}
          </h3>
          <p className="text-safe mt-2 text-sm leading-6 text-muted-foreground">
            {game.description}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <GameMetric icon={<Trophy className="h-3.5 w-3.5" aria-hidden="true" />} label="Nivel" value={game.difficulty} />
          <GameMetric icon={<Zap className="h-3.5 w-3.5" aria-hidden="true" />} label="XP" value={`+${game.xpReward}`} />
          <GameMetric icon={<Clock className="h-3.5 w-3.5" aria-hidden="true" />} label="Tempo" value={game.estimatedTime} />
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Timer className="h-3.5 w-3.5" aria-hidden="true" />
              Dominio
            </span>
            <span className="text-primary">{value}% dominado</span>
          </div>
          <AnimatedProgress value={value} />
        </div>

        {game.unlocked ? (
          <Button asChild className="mt-5 w-full border-primary/80 bg-primary text-primary-foreground hover:bg-primary/90">
            <Link href={`/games/${game.category}/${game.id}`}>
              Jogar
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        ) : (
          <Button className="mt-5 w-full" variant="outline" disabled>
            <Lock className="h-4 w-4" aria-hidden="true" />
            Bloqueado
          </Button>
        )}
      </div>
    </motion.article>
  );
}

export function GameCardGrid({
  games,
  progress,
  variant = "default",
  className,
}: {
  games: GameDefinition[];
  progress: Record<string, GameProgress | undefined>;
  variant?: GameCardVariant;
  className?: string;
}) {
  return (
    <div className={cn("fluid-grid gap-4 [--grid-min:18rem]", className)}>
      {games.map((game, index) => (
        <GameCard key={game.id} game={game} progress={progress[game.id]} variant={variant} index={index} />
      ))}
    </div>
  );
}

function GameThumbnail({ game, icon, accent, compact }: { game: GameDefinition; icon: React.ReactNode; accent: string; compact: boolean }) {
  const code = game.thumbnail.replace(/-/g, " / ");

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md border border-border bg-background/64",
        compact ? "aspect-[16/8]" : "aspect-[16/9]",
      )}
    >
      <div
        className="absolute inset-0 opacity-80"
        style={{
          background:
            `radial-gradient(circle at 18% 18%, ${accent} 0, transparent 28%), ` +
            "radial-gradient(circle at 82% 18%, rgba(255,255,255,.72), transparent 24%), " +
            "linear-gradient(135deg, rgba(255,255,255,.82), rgba(255,255,255,.32) 48%, rgba(58,134,255,.10))",
        }}
      />
      <div className="absolute inset-0 opacity-[0.24] [background-image:linear-gradient(rgba(20,30,55,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(20,30,55,.15)_1px,transparent_1px)] [background-size:22px_22px]" />
      <div className="absolute -bottom-10 left-6 h-28 w-28 rotate-45 rounded-2xl border border-primary/20 bg-primary/10" />
      <div className="absolute bottom-4 right-4 h-16 w-24 -skew-x-12 rounded-md border border-border bg-card/70" />

      <div className="relative flex h-full flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-md border border-primary/25 bg-primary/12 text-primary">{icon}</div>
          <span className="game-chip inline-flex items-center gap-1 bg-card/80 px-2.5 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            treino
          </span>
        </div>
        <p className="text-safe text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{code}</p>
      </div>
    </div>
  );
}

function GameMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-background/62 px-2.5 py-2">
      <p className="flex items-center gap-1 text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="text-safe mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function AnimatedProgress({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className="relative h-2.5 overflow-hidden rounded-full border border-border bg-muted/70">
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: `${safeValue}%` }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
        className="relative h-full rounded-full bg-gradient-to-r from-primary via-primary/50 to-primary"
        style={{ filter: "drop-shadow(0 0 10px hsl(var(--primary) / 0.28))" }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,.55),transparent)] opacity-60" />
      </motion.div>
    </div>
  );
}
