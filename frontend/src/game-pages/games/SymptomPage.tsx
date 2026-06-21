"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle } from "lucide-react";

import { getAllGames } from "@/features/gamification/catalog";
import { masteryForHub, selectGamesForHub } from "@/features/gamification/adaptive";
import { getSymptomHub } from "@/features/gamification/symptoms";
import { GameCardGrid } from "@/game-pages/games/components/GameCard";
import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game-store";
import { cn } from "@/utils";

function isDoneToday(lastPlayedAt?: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return !!lastPlayedAt && lastPlayedAt.slice(0, 10) === today;
}

export default function SymptomPage({ symptomId }: { symptomId: string }) {
  const hub = getSymptomHub(symptomId);
  const progress = useGameStore((state) => state.progress);
  const adaptive = useGameStore((state) => state.adaptive);
  const remoteGames = useGameStore((state) => state.remoteGames);
  const hydrateRemoteGames = useGameStore((state) => state.hydrateRemoteGames);

  useEffect(() => {
    hydrateRemoteGames();
  }, [hydrateRemoteGames]);

  const allHubGames = useMemo(() => {
    if (!hub) return [];
    const wanted = new Set(hub.tags);
    const deep = new Set(hub.missionEngines);
    return getAllGames(remoteGames)
      .filter((g) => (g.tags ?? []).some((t) => wanted.has(t)))
      .sort((a, b) => Number(deep.has(b.engine)) - Number(deep.has(a.engine)) || b.xpReward - a.xpReward);
  }, [hub, remoteGames]);

  // Adaptive training plan: difficulty-aware, randomized within tier
  // Deps intentionally exclude `adaptive` so the plan is stable for the session
  const trainingPlan = useMemo(
    () => (hub ? selectGamesForHub(hub.id, getAllGames(remoteGames), adaptive, 4) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hub?.id, remoteGames],
  );

  const mastery = hub ? masteryForHub(adaptive, hub.id) : 0;
  const hasSignal = hub ? (adaptive.weaknessSignals[hub.id] ?? 0) > 0 || mastery > 0 : false;

  const completedCount = trainingPlan.filter((g) => isDoneToday(progress[g.id]?.lastPlayedAt)).length;
  const firstIncomplete = trainingPlan.find((g) => !isDoneToday(progress[g.id]?.lastPlayedAt));
  const allDone = trainingPlan.length > 0 && completedCount === trainingPlan.length;

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
  const returnTo = `/games/treino/${hub.id}`;

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

      {/* Mastery header */}
      <Surface>
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md border border-primary/25 bg-primary/12 text-primary">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {allHubGames.length} missões · {hub.label}
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-normal">
              {hasSignal ? `Maestria: ${mastery}/100` : "Comece aqui — sem treinos registrados ainda"}
            </h2>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {hub.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      </Surface>

      {/* Adaptive training plan */}
      {trainingPlan.length > 0 && (
        <Surface>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Treino intensivo</p>
              <h2 className="mt-1 text-xl font-semibold tracking-normal">
                {allDone
                  ? "Treino de hoje concluído!"
                  : completedCount > 0
                    ? `${completedCount} de ${trainingPlan.length} concluídos`
                    : "Sua sequência de hoje"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {allDone
                  ? "Volte amanhã para um novo plano adaptativo."
                  : "Exercícios ordenados pela sua maestria atual. A sequência muda a cada sessão."}
              </p>
            </div>
            {firstIncomplete && (
              <Button asChild className="shrink-0">
                <Link
                  href={`/games/${firstIncomplete.category}/${firstIncomplete.id}?returnTo=${encodeURIComponent(returnTo)}`}
                >
                  {completedCount > 0 ? "Próximo exercício" : "Iniciar treino"}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            )}
          </div>

          <ol className="space-y-2">
            {trainingPlan.map((game, index) => {
              const done = isDoneToday(progress[game.id]?.lastPlayedAt);
              return (
                <li key={game.id}>
                  <Link
                    href={`/games/${game.category}/${game.id}?returnTo=${encodeURIComponent(returnTo)}`}
                    className={cn(
                      "game-tile flex items-center gap-3 bg-background/64 p-3 transition-colors hover:border-primary/40 hover:bg-primary/5",
                      done && "opacity-55",
                    )}
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border bg-card text-xs font-semibold text-muted-foreground">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold leading-snug">{game.name}</p>
                      <p className="text-xs text-muted-foreground">{game.estimatedTime}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {game.difficulty}
                    </Badge>
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-label="Concluído hoje" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-muted-foreground/35" aria-hidden="true" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ol>
        </Surface>
      )}

      {/* All missions grid */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Todas as missões</p>
        <GameCardGrid games={allHubGames} progress={progress} />
      </div>
    </div>
  );
}
