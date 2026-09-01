"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { ArrowLeft } from "lucide-react";

import { getCategoryBySlug, getGamesByCategory } from "@/features/gamification/catalog";
import { GameCardGrid } from "@/game-pages/games/components/GameCard";
import { Surface } from "@/components/shared/premium-ui";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game-store";

export default function CategoryPage({ categorySlug }: { categorySlug: string }) {
  const category = getCategoryBySlug(categorySlug);
  const remoteGames = useGameStore((state) => state.remoteGames);
  const hydrateRemoteGames = useGameStore((state) => state.hydrateRemoteGames);
  const progress = useGameStore((state) => state.progress);

  useEffect(() => {
    hydrateRemoteGames();
  }, [hydrateRemoteGames]);

  const games = useMemo(() => {
    if (!category) return [];
    return getGamesByCategory(category.id, remoteGames);
  }, [category, remoteGames]);

  const mastery = games.length ? Math.round(games.reduce((sum, game) => sum + game.progress, 0) / games.length) : 0;

  if (!category) {
    return (
      <Surface className="text-center">
        <h1 className="text-2xl font-semibold">Categoria não encontrada</h1>
        <Button asChild className="mt-4">
          <Link href="/games">Voltar ao hub</Link>
        </Button>
      </Surface>
    );
  }

  const Icon = category.icon;

  return (
    <div className="space-y-3">
      <Link
        href="/games"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[hsl(var(--accent-700))] hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Voltar
      </Link>

      <div className="flex items-center gap-7 rounded-[28px] bg-[hsl(var(--accent-900))] p-7 text-white shadow-accent-lg">
        <div className="grid h-[66px] w-[66px] shrink-0 place-items-center rounded-control border border-white/15 bg-white/10 text-white">
          <Icon className="h-[30px] w-[30px]" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[hsl(var(--accent-300))]">Hub de treino</span>
          <p className="font-display mt-1 text-[25px] font-medium leading-tight">{category.name}</p>
          <p className="mt-1.5 max-w-[460px] text-[14px] text-white/70">{category.description}</p>
        </div>
        <div className="w-[130px] shrink-0 text-center">
          <p className="text-[32px] font-bold leading-none">{mastery}%</p>
          <p className="mb-2.5 text-[12px] text-white/60">maestria</p>
          <div className="h-[7px] overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-[hsl(var(--accent-300))]" style={{ width: `${mastery}%` }} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-semibold">Jogos deste hub</h2>
        <span className="text-[13px] text-muted-foreground">{games.length} jogos</span>
      </div>

      <GameCardGrid games={games} progress={progress} />
    </div>
  );
}
