"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Gauge, Medal, Play, Sparkles, Star, Zap, type LucideIcon } from "lucide-react";

import { getEnrichedGames, getRecommendedGames } from "@/features/gamification/catalog";
import { masteryForHub, recommendHub } from "@/features/gamification/adaptive";
import { getRankSnapshot } from "@/features/xp/xp";
import { gamesForHub, symptomHubs } from "@/features/gamification/symptoms";
import { PageHeader } from "@/components/shared/premium-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { useGameStore } from "@/stores/game-store";

const HUB_TINTS = ["#8b5cf6", "#0a84ff", "hsl(var(--primary))", "#e6820e", "#e5484d", "#14b8a6", "#8b5cf6"];

export default function GamesHub() {
  const [ready, setReady] = useState(false);
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

  const recommendation = recommendHub(adaptive, games);
  const recommendedMission = recommendation.missionGameId ? games.find((game) => game.id === recommendation.missionGameId) : undefined;
  const recommendedHub = symptomHubs.find((hub) => hub.id === recommendation.hub);
  const recommendedMastery = recommendedHub ? masteryForHub(adaptive, recommendedHub.id) : 0;
  const primaryGame = recommendedMission ?? recommended[0];
  const rank = getRankSnapshot(xp);

  if (!ready) {
    return <GamesHubSkeleton />;
  }

  const metrics: { icon: LucideIcon; value: string; label: string; tint: string }[] = [
    { icon: Medal, value: rank.current.name, label: "Rank atual", tint: "#e6820e" },
    { icon: Star, value: xp.toLocaleString("pt-BR"), label: "XP total", tint: "hsl(var(--primary))" },
    { icon: Zap, value: `${streak.current} dias`, label: "Sequência", tint: "#e5484d" },
    { icon: Gauge, value: `${overallProgress}%`, label: "Maestria geral", tint: "#0a84ff" },
  ];

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        eyebrow="Treino"
        title="Micro-desafios para lapidar cada competência da escrita"
        action={
          <Link
            href="/games/simulado"
            className="flex items-center gap-2 rounded-control border border-border bg-card px-4 py-2.5 text-[14px] font-semibold text-foreground"
          >
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            Simulado adaptativo
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="flex items-center gap-3.5 rounded-card bg-card p-5 shadow-soft">
            <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-control" style={{ backgroundColor: `${metric.tint}1a` }}>
              <metric.icon className="h-5 w-5" style={{ color: metric.tint }} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[22px] font-bold leading-none tabular-nums">{metric.value}</p>
              <p className="mt-1 text-[12px] text-muted-foreground">{metric.label}</p>
            </div>
          </div>
        ))}
      </div>

      {primaryGame && recommendedHub ? (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-7 rounded-[18px] bg-[hsl(var(--accent-900))] p-7 text-white"
        >
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2.5">
              <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[hsl(var(--accent-300))]">Recomendado pra você</span>
              <span className="rounded-md bg-white/15 px-2.5 py-0.5 text-[11px] font-bold">Desafio de hoje</span>
            </div>
            <p className="font-display text-[25px] font-medium leading-tight">{primaryGame.name}</p>
            <p className="mt-1.5 max-w-[460px] text-[14px] text-white/70">{recommendation.reason}</p>
            <div className="mt-4.5 flex items-center gap-4">
              <Link
                href={`/games/${primaryGame.category}/${primaryGame.id}`}
                className="flex items-center gap-2 rounded-control bg-white px-6 py-3 text-[14px] font-bold text-[hsl(var(--accent-900))]"
              >
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                Jogar agora
              </Link>
              <span className="text-[13px] text-white/60">~4 min · +60 XP</span>
            </div>
          </div>
          <div className="grid h-[150px] w-[150px] shrink-0 place-items-center rounded-full border-[3px] border-dashed border-[hsl(var(--accent-300)/40%)]">
            <div className="text-center">
              <p className="text-[38px] font-bold leading-none">{recommendedMastery}%</p>
              <p className="text-[12px] text-white/60">domínio neste hub</p>
            </div>
          </div>
        </motion.div>
      ) : null}

      <section id="sintomas">
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="text-[17px] font-semibold">Hubs de treino</h2>
          <span className="text-[13px] text-muted-foreground">
            Maestria geral <strong className="text-foreground">{overallProgress}%</strong>
          </span>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3.5">
          {symptomHubs.map((hub, index) => {
            const HubIcon = hub.icon;
            const mastery = masteryForHub(adaptive, hub.id);
            const tint = HUB_TINTS[index % HUB_TINTS.length];
            const isRecommended = hub.id === recommendation.hub;
            return (
              <Link
                key={hub.id}
                href={`/games/treino/${hub.id}`}
                className="rounded-card bg-card p-5 shadow-soft transition-shadow hover:shadow-elevated"
              >
                <div className="mb-3.5 flex items-center justify-between">
                  <span className="grid h-[46px] w-[46px] place-items-center rounded-[13px]" style={{ backgroundColor: `${tint}1a` }}>
                    <HubIcon className="h-[22px] w-[22px]" style={{ color: tint }} aria-hidden="true" />
                  </span>
                  {isRecommended ? (
                    <span className="rounded-md bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">Recomendado</span>
                  ) : null}
                </div>
                <h3 className="text-[15px] font-semibold leading-tight text-foreground">{hub.title}</h3>
                <p className="mt-0.5 text-[12px] text-muted-foreground">{gamesForHub(games, hub).length} jogos</p>
                <div className="mt-4 flex items-center gap-2.5">
                  <div className="h-[7px] flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${mastery}%`, backgroundColor: tint }} />
                  </div>
                  <span className="min-w-[34px] text-right text-[12px] font-bold tabular-nums text-foreground/70">{mastery}%</span>
                </div>
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
      <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-16" />
        ))}
      </div>
      <Skeleton className="h-40" />
      <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-40" />
        ))}
      </div>
    </div>
  );
}
