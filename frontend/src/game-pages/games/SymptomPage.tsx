"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { ArrowLeft } from "lucide-react";

import { getAllGames } from "@/features/gamification/catalog";
import { gamesForHub, getSymptomHub, masteryForTags, recommendTrainings } from "@/features/gamification/symptoms";
import { GameCardGrid } from "@/game-pages/games/components/GameCard";
import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game-store";

export default function SymptomPage({ symptomId }: { symptomId: string }) {
  const hub = getSymptomHub(symptomId);
  const progress = useGameStore((state) => state.progress);
  const skills = useGameStore((state) => state.skills);
  const remoteGames = useGameStore((state) => state.remoteGames);
  const hydrateRemoteGames = useGameStore((state) => state.hydrateRemoteGames);

  useEffect(() => {
    hydrateRemoteGames();
  }, [hydrateRemoteGames]);

  const games = useMemo(() => (hub ? gamesForHub(getAllGames(remoteGames), hub) : []), [hub, remoteGames]);
  const recommended = useMemo(() => recommendTrainings(games, skills, 1)[0], [games, skills]);
  const mastery = hub ? masteryForTags(skills, hub.tags) : null;

  if (!hub) {
    return (
      <Surface className="text-center">
        <h1 className="text-2xl font-semibold">Sintoma não encontrado</h1>
        <Button asChild className="mt-4">
          <Link href="/games">Voltar ao hub</Link>
        </Button>
      </Surface>
    );
  }

  const Icon = hub.icon;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Treino por sintoma"
        title={hub.title}
        description={hub.description}
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-md border border-primary/25 bg-primary/12 text-primary">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{games.length} treinos para este sintoma</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-normal">
                {mastery === null ? "Sem diagnóstico ainda — comece a treinar" : `Sua maestria: ${mastery}%`}
              </h2>
            </div>
          </div>
          {recommended && (
            <Button asChild>
              <Link href={`/games/${recommended.category}/${recommended.id}`}>Treino recomendado: {recommended.name}</Link>
            </Button>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {hub.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      </Surface>

      <GameCardGrid games={games} progress={progress} />
    </div>
  );
}
