"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";

import { getCategoryBySlug, getGamesByCategory } from "@/features/gamification/catalog";
import { GameCardGrid } from "@/game-pages/games/components/GameCard";
import { Surface } from "@/components/shared/premium-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGameStore } from "@/stores/game-store";

export default function CategoryPage({ categorySlug }: { categorySlug: string }) {
  const category = getCategoryBySlug(categorySlug);
  const [query, setQuery] = useState("");
  const remoteGames = useGameStore((state) => state.remoteGames);
  const hydrateRemoteGames = useGameStore((state) => state.hydrateRemoteGames);

  useEffect(() => {
    hydrateRemoteGames();
  }, [hydrateRemoteGames]);

  const games = useMemo(() => {
    if (!category) return [];
    const normalizedQuery = query.trim().toLowerCase();
    return getGamesByCategory(category.id, remoteGames).filter((game) =>
      !normalizedQuery || `${game.name} ${game.description} ${game.skill}`.toLowerCase().includes(normalizedQuery),
    );
  }, [category, query, remoteGames]);

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
      <div className="rounded-[28px] bg-[hsl(var(--accent-900))] p-7 text-white">
        <div className="flex items-start justify-between gap-4">
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
          <Button asChild variant="outline" className="shrink-0 border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white">
            <Link href="/games">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Hub
            </Link>
          </Button>
        </div>

        <div className="mt-6 flex flex-col gap-4 border-t border-white/12 pt-5 lg:flex-row lg:items-end lg:justify-between">
          <p className="text-[13px] text-white/60">
            {games.length} jogos disponíveis · escolha qualquer um desta categoria
          </p>
          <div className="relative w-full lg:max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar jogo ou habilidade"
              className="border-white/15 bg-white/10 pl-9 text-white placeholder:text-white/50"
            />
          </div>
        </div>
      </div>

      <GameCardGrid games={games} progress={{}} />
    </div>
  );
}
