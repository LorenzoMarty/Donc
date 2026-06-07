"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CalendarCheck, ChevronRight, Dumbbell } from "lucide-react";

import { getEnrichedGames, getRecommendedGames } from "@/features/gamification/catalog";
import { masteryForHub } from "@/features/gamification/adaptive";
import { symptomHubs } from "@/features/gamification/symptoms";
import { ProgressDashboard } from "@/game-pages/games/components/ProgressDashboard";
import { AdaptiveSpotlight } from "@/game-pages/games/components/AdaptiveSpotlight";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGameStore } from "@/stores/game-store";

const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;
const pageOpenedAt = Date.now();

export default function GamesHub() {
  const [ready, setReady] = useState(false);
  const attempts = useGameStore((state) => state.attempts);
  const progress = useGameStore((state) => state.progress);
  const adaptive = useGameStore((state) => state.adaptive);
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
  const continueGame = lastAttempt ? games.find((game) => game.id === lastAttempt.gameId) : recommended[0];
  const dailyGame = games.find((game) => game.category === "desafios-diarios") ?? recommended[0];

  const weeklyProgress = useMemo(() => {
    const sevenDaysAgo = pageOpenedAt - WEEK_IN_MS;
    const activeDays = new Set(
      attempts.filter((attempt) => new Date(attempt.playedAt).getTime() >= sevenDaysAgo).map((attempt) => attempt.playedAt.slice(0, 10)),
    );
    return Math.min(100, Math.round((activeDays.size / 5) * 100));
  }, [attempts]);

  if (!ready) {
    return <GamesHubSkeleton />;
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <motion.header
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22.5rem)] lg:items-stretch"
      >
        <div className="game-surface relative overflow-hidden bg-card p-5 md:p-7">
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-primary/45" aria-hidden="true" />
          <div className="relative max-w-3xl">
            <div className="game-chip mb-5 inline-flex items-center gap-2 bg-primary/12 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              <Dumbbell className="h-4 w-4" aria-hidden="true" />
              Academia de escrita
            </div>
            <h1 className="text-3xl font-semibold leading-tight tracking-normal text-foreground md:text-4xl">Centro de Treinamento</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              Evolua sua escrita dominando cada habilidade do ENEM.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              {continueGame && (
                <Button asChild size="lg">
                  <Link href={`/games/${continueGame.category}/${continueGame.id}`}>
                    Continuar treino
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" size="lg">
                <Link href="#sintomas">
                  Ver sintomas
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <motion.aside
          initial={{ opacity: 0, scale: 0.98, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.36, ease: "easeOut" }}
          className="game-surface relative overflow-hidden bg-primary p-5 text-primary-foreground"
        >
          <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/30 blur-3xl" aria-hidden="true" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/65">Desafio diario</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-normal">{dailyGame?.name ?? "Treino rapido"}</h2>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-md border border-foreground/15 bg-foreground/10">
                <CalendarCheck className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-foreground/70">
              {dailyGame?.description ?? "Uma sessao curta para manter a rotina e medir evolucao real."}
            </p>
            {dailyGame && (
              <Button asChild variant="secondary" className="mt-auto w-full">
                <Link href={`/games/${dailyGame.category}/${dailyGame.id}`}>Iniciar agora</Link>
              </Button>
            )}
          </div>
        </motion.aside>
      </motion.header>

      <ProgressDashboard overallProgress={overallProgress} weeklyProgress={weeklyProgress} />

      <AdaptiveSpotlight adaptive={adaptive} games={games} />

      <section id="sintomas" className="game-surface relative overflow-hidden bg-card p-4 md:p-5">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Treine pelo seu sintoma</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal text-foreground md:text-3xl">O que está travando sua redação?</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Escolha o sintoma que você sente na própria escrita — o treinador monta a sequência de missões certa para ele.
          </p>
        </div>
        <div className="fluid-grid gap-3 [--grid-min:17rem]">
          {symptomHubs.map((hub) => {
            const HubIcon = hub.icon;
            const mastery = masteryForHub(adaptive, hub.id);
            return (
              <Link
                key={hub.id}
                href={`/games/treino/${hub.id}`}
                className="game-tile group flex flex-col gap-3 bg-background/64 p-4 transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="grid h-10 w-10 place-items-center rounded-md border border-primary/25 bg-primary/12 text-primary">
                    <HubIcon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  {mastery > 0 && (
                    <span className="rounded-full border border-border bg-card px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                      {mastery}/100
                    </span>
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
    <div className="space-y-5">
      <div className="space-y-5 md:space-y-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22.5rem)]">
          <div className="game-surface bg-card p-5 md:p-7">
            <Skeleton className="mb-5 h-8 w-48" />
            <Skeleton className="mb-4 h-12 w-full max-w-xl md:h-16" />
            <Skeleton className="h-5 w-full max-w-2xl" />
          </div>
          <div className="game-surface bg-primary/80 p-5">
            <Skeleton className="mb-4 h-8 w-32" />
            <Skeleton className="mb-3 h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
        <div className="fluid-grid gap-3 [--grid-min:11rem]">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
        <div className="fluid-grid gap-3 [--grid-min:17rem]">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-64" />
          ))}
        </div>
      </div>
    </div>
  );
}
