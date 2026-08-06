"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Gamepad2, Lock, Star } from "lucide-react";

import type { GameDefinition, GameProgress } from "@/features/gamification/types";
import { getCategoryBySlug } from "@/features/gamification/catalog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils";

type GameCardProps = {
  game: GameDefinition;
  progress?: GameProgress;
  index?: number;
  className?: string;
};

function GameCard({ game, progress, index = 0, className }: GameCardProps) {
  const category = getCategoryBySlug(game.category);
  const Icon = category?.icon ?? Gamepad2;
  const played = (progress?.plays ?? 0) > 0;
  const stars = played ? Math.round((progress?.bestAccuracy ?? 0) / 20) : 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.035, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3, boxShadow: "0 12px 28px rgba(20,30,55,.08)" }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        "game-surface group relative flex h-full min-w-0 flex-col rounded-[18px] bg-card p-4 text-foreground transition-colors duration-300 hover:border-primary/30",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-control border border-border bg-background/64 text-muted-foreground">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        {game.unlocked ? (
          progress?.completedToday ? (
            <Badge className="border-primary/20 bg-primary/10 text-primary">Concluído</Badge>
          ) : null
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            <Lock className="h-3 w-3" aria-hidden="true" />
            Bloqueado
          </Badge>
        )}
      </div>

      <h3 className="mt-3.5 text-lg font-semibold tracking-normal text-foreground">
        {game.name}
      </h3>
      <p className="text-safe mt-1 text-sm leading-6 text-muted-foreground">{game.description}</p>

      <span className="game-chip mt-3 inline-flex w-fit items-center gap-1.5 bg-card/80 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {category?.name ?? game.category} · {game.estimatedTime}
      </span>

      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        {played ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <StarRating value={stars} />
            <span>Melhor: {Math.round(progress?.bestAccuracy ?? 0)}%</span>
          </div>
        ) : (
          <span />
        )}

        {game.unlocked ? (
          <Link
            href={`/games/${game.category}/${game.id}`}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            {played ? "Jogar de novo" : "Jogar"}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </motion.article>
  );
}

export function GameCardGrid({
  games,
  progress,
  className,
}: {
  games: GameDefinition[];
  progress: Record<string, GameProgress | undefined>;
  className?: string;
}) {
  return (
    <div className={cn("fluid-grid gap-4 [--grid-min:18rem]", className)}>
      {games.map((game, index) => (
        <GameCard key={game.id} game={game} progress={progress[game.id]} index={index} />
      ))}
    </div>
  );
}

function StarRating({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(5, value));

  return (
    <div className="flex items-center gap-0.5" aria-label={`${safeValue} de 5 estrelas`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={cn("h-3.5 w-3.5", index < safeValue ? "fill-primary text-primary" : "text-border")}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
