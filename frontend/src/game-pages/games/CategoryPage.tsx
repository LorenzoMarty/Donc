"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";

import { getCategoryBySlug, getGamesByCategory } from "@/features/gamification/catalog";
import { GameCardGrid } from "@/game-pages/games/components/GameCard";
import { defaultGameFilters, GameFilters, type GameFilterState } from "@/game-pages/games/components/GameFilters";
import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CategoryPage({ categorySlug }: { categorySlug: string }) {
  const category = getCategoryBySlug(categorySlug);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<GameFilterState>(defaultGameFilters);

  const games = useMemo(() => {
    if (!category) return [];
    const normalizedQuery = query.trim().toLowerCase();
    return getGamesByCategory(category.id).filter((game) => {
      const matchesQuery = !normalizedQuery || `${game.name} ${game.description} ${game.skill}`.toLowerCase().includes(normalizedQuery);
      const matchesDifficulty = filters.difficulty === "Todos" || game.difficulty === filters.difficulty;
      return matchesQuery && matchesDifficulty;
    });
  }, [category, filters, query]);

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
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        eyebrow="Categoria"
        title={category.name}
        description={category.description}
        action={
          <Button asChild variant="outline">
            <Link href="/games">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Hub
            </Link>
          </Button>
        }
      />

      <Surface>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-md border border-primary/25 bg-primary/12 text-secondary">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{games.length} jogos disponiveis</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-normal">Treino livre, sem trilha linear</h2>
            </div>
          </div>
          <div className="relative w-full lg:max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar jogo ou habilidade"
              className="pl-9"
            />
          </div>
        </div>
        <div className="mt-5">
          <GameFilters value={filters} onChange={setFilters} />
        </div>
      </Surface>

      <GameCardGrid games={games} progress={{}} />
    </div>
  );
}
