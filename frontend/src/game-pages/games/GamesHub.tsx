"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CalendarCheck, ChevronRight, Dumbbell, Flame, Shield, Sparkles, Zap } from "lucide-react";

import { getEnrichedGames, getRecommendedGames } from "@/features/gamification/catalog";
import { masteryForHub, recommendHub } from "@/features/gamification/adaptive";
import { getRankSnapshot } from "@/features/xp/xp";
import { symptomHubs } from "@/features/gamification/symptoms";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGameStore } from "@/stores/game-store";
import { cn } from "@/utils";

const HUB_TONE = [
  { tile: "bg-primary/8", icon: "bg-primary/12 text-primary" },
  { tile: "bg-info-tint/60", icon: "bg-info-tint text-info" },
  { tile: "bg-streak-tint/60", icon: "bg-streak-tint text-streak" },
  { tile: "bg-highlight-tint/60", icon: "bg-highlight-tint text-highlight" },
] as const;

export default function GamesHub() {
  const [ready, setReady] = useState(false);
  const attempts = useGameStore((state) => state.attempts);
  const progress = useGameStore((state) => state.progress);
  const adaptive = useGameStore((state) => state.adaptive);
  const xp = useGameStore((state) => state.xp);
  const streak = useGameStore((state) => state.streak);
  const remoteGames = useGameStore((state) => state.remoteGames);
  const hydrateRemoteGames = useGameStore((state) => state.hydrateRemoteGames);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 280);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    hydrateRemoteGames();
  }, [hydrateRemoteGames]);

  const games = getEnrichedGames(progress, remoteGames);
  const recommended = getRecommendedGames(progress, remoteGames);
  const overallProgress = games.length ? Math.round(games.reduce((sum, game) => sum + game.progress, 0) / games.length) : 0;
  const lastAttempt = attempts[0];
  const continueGame = lastAttempt ? games.find((game) => game.id === lastAttempt.gameId) : undefined;
  const dailyGame = games.find((game) => game.category === "desafios-diarios") ?? recommended[0];

  const recommendation = recommendHub(adaptive, games);
  const recommendedMission = recommendation.missionGameId ? games.find((game) => game.id === recommendation.missionGameId) : undefined;
  const rank = getRankSnapshot(xp);

  const primaryGame = continueGame ?? recommendedMission ?? recommended[0];
  const primaryLabel = continueGame ? "Continuar treino" : "Treinar agora";
  const showDailyChip = dailyGame && dailyGame.id !== primaryGame?.id;

  if (!ready) {
    return <GamesHubSkeleton />;
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-card bg-primary p-6 text-primary-foreground md:p-8"
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/12" aria-hidden="true" />
        <div className="relative max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]">
            <Dumbbell className="h-4 w-4" aria-hidden="true" />
            Academia de escrita
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary-foreground/70">
            {continueGame ? "Retome de onde parou" : "Recomendado pra você agora"}
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-normal md:text-4xl">
            {continueGame ? continueGame.name : recommendedMission?.name ?? "Comece seu primeiro treino"}
          </h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-primary-foreground/90">
            {continueGame ? continueGame.description : recommendation.reason}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
            {primaryGame && (
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
                <Link href={`/games/${primaryGame.category}/${primaryGame.id}`}>
                  {primaryLabel}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            )}
            {showDailyChip && (
              <Link href={`/games/${dailyGame.category}/${dailyGame.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline">
                <CalendarCheck className="h-4 w-4" aria-hidden="true" />
                Desafio de hoje: {dailyGame.name}
              </Link>
            )}
            <Link href="/games/simulado" className="inline-flex items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Simulado adaptativo
            </Link>
          </div>
        </div>
      </motion.section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-[auto_1fr_auto_auto]">
        <div className="flex items-center gap-2.5 rounded-control bg-card px-4 py-3 shadow-soft">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-highlight-tint text-highlight">
            <Shield className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{rank.current.name}</p>
            <p className="text-xs text-muted-foreground">rank atual</p>
          </div>
        </div>

        <div className="order-first col-span-2 flex items-center gap-3 rounded-control bg-card px-4 py-3 shadow-soft md:order-none md:col-span-1">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-primary/12 text-primary">
            <Zap className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold tabular-nums">{xp} XP</span>
              <span className="text-muted-foreground">{rank.next ? `${rank.xpToNext} para ${rank.next.name}` : "rank máximo"}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${rank.progress}%` }} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-control bg-card px-4 py-3 shadow-soft">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-streak-tint text-streak">
            <Flame className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tabular-nums">{streak.current} dias</p>
            <p className="text-xs text-muted-foreground">sequência</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-control bg-card px-4 py-3 shadow-soft">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-info-tint text-info">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tabular-nums">{overallProgress}%</p>
            <p className="text-xs text-muted-foreground">domínio geral</p>
          </div>
        </div>
      </div>

      <section id="sintomas">
        <div className="mb-4">
          <h2 className="text-xl font-semibold tracking-normal text-foreground md:text-2xl">Ou escolha o que travar sua redação</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Identifique o sintoma que aparece na sua escrita — o treinador monta a sequência de missões para ele.
          </p>
        </div>
        <div className="fluid-grid gap-3 [--grid-min:17rem]">
          {symptomHubs.map((hub, index) => {
            const HubIcon = hub.icon;
            const mastery = masteryForHub(adaptive, hub.id);
            const tone = HUB_TONE[index % HUB_TONE.length];
            const isRecommended = hub.id === recommendation.hub;
            return (
              <Link
                key={hub.id}
                href={`/games/treino/${hub.id}`}
                className={cn(
                  "group relative flex flex-col gap-3 rounded-control p-4 shadow-soft transition-transform hover:-translate-y-0.5",
                  tone.tile,
                  isRecommended && "ring-2 ring-primary",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("grid h-10 w-10 place-items-center rounded-control", tone.icon)}>
                    <HubIcon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  {isRecommended ? (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">Recomendado</span>
                  ) : (
                    mastery > 0 && (
                      <span className="rounded-full bg-card px-2 py-0.5 text-xs font-semibold text-muted-foreground shadow-soft">
                        {mastery}/100
                      </span>
                    )
                  )}
                </div>
                <h3 className="text-base font-semibold leading-snug tracking-normal text-foreground">{hub.title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{hub.description}</p>
                <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  Treinar
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function GamesHubSkeleton() {
  return (
    <div className="space-y-5 md:space-y-6">
      <div className="rounded-card bg-primary/80 p-6 md:p-8">
        <Skeleton className="mb-5 h-6 w-40 bg-white/20" />
        <Skeleton className="mb-4 h-10 w-full max-w-xl bg-white/20" />
        <Skeleton className="h-5 w-full max-w-lg bg-white/20" />
      </div>
      <div className="grid grid-cols-3 gap-3 md:grid-cols-[auto_1fr_auto_auto]">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-14" />
        ))}
      </div>
      <div className="fluid-grid gap-3 [--grid-min:17rem]">
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton key={index} className="h-40" />
        ))}
      </div>
    </div>
  );
}
