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

  if (!category) {
    return (
      <Surface className="text-center">
        <h1 className="text-2xl font-semibold">Categoria nao encontrada</h1>
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

      <div className="rounded-[28px] bg-[hsl(var(--accent-900))] p-7 text-white">
        <div className="flex items-start gap-3.5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-control border border-white/15 bg-white/10 text-white">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[hsl(var(--accent-300))]">Categoria</span>
            <p className="font-display text-[25px] font-medium leading-tight">{category.name}</p>
            <p className="mt-1.5 max-w-[460px] text-[14px] text-white/70">{category.description}</p>
          </div>
        </div>

        <p className="mt-6 border-t border-white/12 pt-5 text-[13px] text-white/60">
          {games.length} jogos disponíveis · escolha qualquer um desta categoria
        </p>
      </div>

      <GameCardGrid games={games} progress={progress} />
    </div>
  );
}
