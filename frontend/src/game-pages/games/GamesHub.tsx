"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Gauge, Play, Zap, type LucideIcon } from "lucide-react";

import { getEnrichedCategories, getEnrichedGames, getRecommendedGames } from "@/features/gamification/catalog";
import { masteryForHub, missionForHub, recommendHub } from "@/features/gamification/adaptive";
import type { SymptomHubId } from "@/features/gamification/types";
import { CategoryCard } from "@/game-pages/games/components/CategoryCard";
import { PageHeader } from "@/components/shared/premium-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch, type Dashboard, type NextRecommendedAction } from "@/services/api";
import { useGameStore } from "@/stores/game-store";

const KNOWN_HUB_IDS = new Set<string>([
  "texto-robotico",
  "repete-ideias",
  "repertorio-nao-encaixa",
  "nao-aprofunda",
  "introducao-sem-tese",
  "perde-na-c3",
  "conclusao-formula",
]);

export default function GamesHub() {
  const [ready, setReady] = useState(false);
  const [backendAction, setBackendAction] = useState<NextRecommendedAction | null>(null);
  const [streakDays, setStreakDays] = useState<number | null>(null);
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

  useEffect(() => {
    let ignore = false;
    apiFetch<NextRecommendedAction[]>("/ai/recommended-actions")
      .then((actions) => {
        // REQ-3 (auditoria P1-1): olha a lista inteira por uma acao GAME, nao so a primeira —
        // o backend normalmente prioriza LESSON/EXERCISE antes de GAME pro mesmo issue ativo, e
        // descartar o resto da lista jogava fora uma recomendacao de jogo valida na maioria dos
        // casos, caindo pro calculo local sem necessidade.
        if (!ignore) setBackendAction(actions.find((action) => action.type === "GAME") ?? actions[0] ?? null);
      })
      .catch(() => undefined);
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    // REQ-2 (auditoria P0-2): streak exibido aqui usava calculo client-side (corte de dia em
    // UTC) que podia divergir do streak oficial (backend, fuso America/Sao_Paulo) numa janela
    // de horario especifica — le direto do backend, mesma fonte que dashboard/perfil.
    apiFetch<Dashboard>("/dashboard")
      .then((dashboard) => {
        if (!ignore) setStreakDays(dashboard.streak_days);
      })
      .catch(() => undefined);
    return () => {
      ignore = true;
    };
  }, []);

  const games = useMemo(() => getEnrichedGames(progress, remoteGames), [progress, remoteGames]);
  const categories = useMemo(() => getEnrichedCategories(progress, remoteGames), [progress, remoteGames]);
  const recommended = useMemo(() => getRecommendedGames(progress, remoteGames), [progress, remoteGames]);
  const overallProgress = games.length ? Math.round(games.reduce((sum, game) => sum + game.progress, 0) / games.length) : 0;

  // Fonte de prioridade: RecommendationEngine do backend quando ele aponta pra um GAME (unico
  // ponto de decisao entre Dashboard/Games/Perfil). `missionForHub`/`recommendHub` seguem
  // resolvendo qual jogo concreto representa o hub — papel de resolucao, nao de priorizacao.
  const backendHub = backendAction?.type === "GAME" && backendAction.target && KNOWN_HUB_IDS.has(backendAction.target)
    ? (backendAction.target as SymptomHubId)
    : null;
  const localRecommendation = recommendHub(adaptive, games);
  const hub = backendHub ?? localRecommendation.hub;
  const reason = backendHub ? backendAction!.reason : localRecommendation.reason;
  const recommendedMission = missionForHub(hub, games);
  const recommendedMastery = masteryForHub(adaptive, hub);
  const primaryGame = recommendedMission ?? recommended[0];

  if (!ready) {
    return <GamesHubSkeleton />;
  }

  const metrics: { icon: LucideIcon; value: string; label: string; tint: string }[] = [
    { icon: Zap, value: `${streakDays ?? 0} dias`, label: "Sequência", tint: "#e5484d" },
    { icon: Gauge, value: `${overallProgress}%`, label: "Maestria geral", tint: "#0a84ff" },
  ];

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader title="Treino" description="Micro-desafios para lapidar cada competência da escrita" />

      <div className="grid grid-cols-2 gap-3.5">
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

      {primaryGame ? (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-7 rounded-[18px] bg-[hsl(var(--accent-900))] p-7 text-white shadow-accent-lg"
        >
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2.5">
              <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[hsl(var(--accent-300))]">Recomendado pra você</span>
              <span className="rounded-md bg-white/15 px-2.5 py-0.5 text-[11px] font-bold">Desafio de hoje</span>
            </div>
            <p className="font-display text-[25px] font-medium leading-tight">{primaryGame.name}</p>
            <p className="mt-1.5 max-w-[460px] text-[14px] text-white/70">{reason}</p>
            <div className="mt-4.5 flex items-center gap-4">
              <Link
                href={`/games/${primaryGame.category}/${primaryGame.id}`}
                className="flex items-center gap-2 rounded-control bg-white px-6 py-3 text-[14px] font-bold text-[hsl(var(--accent-900))]"
              >
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                Jogar agora
              </Link>
              <span className="text-[13px] text-white/60">~4 min</span>
            </div>
          </div>
          <div className="grid h-[150px] w-[150px] shrink-0 place-items-center rounded-full border-[3px] border-dashed border-[hsl(var(--accent-300)/40%)]">
            <div className="text-center">
              <p className="text-[38px] font-bold leading-none">{recommendedMastery}%</p>
              <p className="text-[12px] text-white/60">de domínio</p>
            </div>
          </div>
        </motion.div>
      ) : null}

      <section id="categorias">
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="text-[17px] font-semibold">Categorias</h2>
          <span className="text-[13px] text-muted-foreground">
            Maestria geral <strong className="text-foreground">{overallProgress}%</strong>
          </span>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3.5">
          {categories.map((category, index) => (
            <CategoryCard key={category.id} category={category} index={index} />
          ))}
        </div>
      </section>
    </div>
  );
}

function GamesHubSkeleton() {
  return (
    <div className="space-y-5 md:space-y-6">
      <div className="grid grid-cols-2 gap-3.5">
        {Array.from({ length: 2 }).map((_, index) => (
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
