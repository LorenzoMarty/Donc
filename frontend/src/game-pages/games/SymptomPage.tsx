"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { getAllGames } from "@/features/gamification/catalog";
import { masteryForHub, selectGamesForHub } from "@/features/gamification/adaptive";
import { getSymptomHub } from "@/features/gamification/symptoms";
import { GameCardGrid } from "@/game-pages/games/components/GameCard";
import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game-store";

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

      {/* Adaptive training plan: sessão contínua encadeada, sem checklist de página em página */}
      {trainingPlan.length > 0 && (
        <Surface>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Treino intensivo</p>
              <h2 className="mt-1 text-xl font-semibold tracking-normal">
                {allDone
                  ? "Treino de hoje concluído!"
                  : completedCount > 0
                    ? `${completedCount} de ${trainingPlan.length} concluídos`
                    : `Sessão de hoje: ${trainingPlan.length} micro-desafios`}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {allDone
                  ? "Volte amanhã para um novo plano adaptativo."
                  : "Exercícios encadeados sem interrupção, ordenados pela sua maestria atual. A sequência muda a cada sessão."}
              </p>
            </div>
            <Button asChild className="shrink-0">
              <Link href={`/games/treino/${hub.id}/sessao?step=${allDone ? 0 : completedCount}`}>
                {allDone ? "Repetir sessão" : completedCount > 0 ? "Continuar sessão" : "Iniciar sessão"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
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
