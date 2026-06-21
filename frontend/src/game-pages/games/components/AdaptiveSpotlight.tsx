"use client";

import Link from "next/link";
import { ArrowRight, Compass, Sparkles, TrendingUp } from "lucide-react";

import { masteryForHub, recommendHub } from "@/features/gamification/adaptive";
import { HUBS } from "@/features/gamification/symptoms";
import type { AdaptiveProfile, GameDefinition } from "@/features/gamification/types";
import { Button } from "@/components/ui/button";

/**
 * Seção "Continue evoluindo": lê o perfil adaptativo, mostra a fraqueza dominante com narrativa e
 * a missão recomendada. Sem dados, convida ao primeiro diagnóstico.
 */
export function AdaptiveSpotlight({ adaptive, games }: { adaptive: AdaptiveProfile; games: GameDefinition[] }) {
  const recommendation = recommendHub(adaptive, games);
  const hub = HUBS[recommendation.hub];
  const mission = recommendation.missionGameId
    ? games.find((game) => game.id === recommendation.missionGameId)
    : undefined;
  const mastery = masteryForHub(adaptive, recommendation.hub);
  const hasSignal = adaptive.recentEvents.length > 0;

  return (
    <section className="game-surface relative overflow-hidden bg-card p-4 md:p-5">
      <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-primary/45" aria-hidden="true" />
      <div className="mb-5 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-md border border-primary/25 bg-primary/12 text-primary">
          <Compass className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Treinador adaptativo</p>
          <h2 className="text-2xl font-semibold tracking-normal text-foreground md:text-3xl">O que treinar agora</h2>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
        <div className="game-tile bg-background/64 p-4 md:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {hasSignal ? "Sua fraqueza dominante" : "Comece por aqui"}
          </p>
          <h3 className="mt-2 text-lg font-semibold leading-snug text-foreground">{hub.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{recommendation.reason}</p>

          {hasSignal && (
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Maestria
                </span>
                <span>{mastery}/100</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${mastery}%` }}
                  aria-hidden="true"
                />
              </div>
            </div>
          )}
        </div>

        <div className="game-tile flex flex-col bg-primary/5 p-4 md:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Missão recomendada</p>
          {mission ? (
            <>
              <h3 className="mt-2 text-lg font-semibold leading-snug text-foreground">{mission.name}</h3>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{mission.description}</p>
              <Button asChild className="mt-auto w-full">
                <Link href={`/games/${mission.category}/${mission.id}`}>
                  Treinar agora
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </>
          ) : (
            <p className="mt-2 inline-flex items-center gap-1 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" /> Em breve.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
