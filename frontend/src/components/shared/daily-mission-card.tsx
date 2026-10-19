"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Circle, Target } from "lucide-react";

import { useAuth } from "@/providers/app-providers";
import { useGameStore } from "@/stores/game-store";
import { buildMission, emptyMissionLog, parseMissionLog, syncMissionLog, type MissionLog, type MissionStep } from "@/features/mission/daily-mission";
import type { Dashboard } from "@/types/api";
import { cn } from "@/utils";

function readLog(key: string): MissionLog {
  try {
    return parseMissionLog(window.localStorage.getItem(key));
  } catch {
    return emptyMissionLog;
  }
}

function writeLog(key: string, log: MissionLog) {
  try {
    window.localStorage.setItem(key, JSON.stringify(log));
  } catch {
    // sem storage (modo privado): a missão só deixa de persistir o histórico
  }
}

/** Missão de hoje: 1 atividade adaptativa + continuar a aula. Estado 100% client-side, como XP/streak.
 * Só monta com o usuário carregado e remonta ao trocar de conta (`key`): o log é lido uma vez, da chave certa. */
export function DailyMissionCard({ dashboard }: { dashboard: Dashboard }) {
  const { user } = useAuth();
  if (!user) return null;
  return <MissionCard key={user.id} userId={user.id} dashboard={dashboard} />;
}

function MissionCard({ userId, dashboard }: { userId: number; dashboard: Dashboard }) {
  const adaptive = useGameStore((state) => state.adaptive);
  const attempts = useGameStore((state) => state.attempts);
  const games = useGameStore((state) => state.remoteGames);
  const hydrateRemoteGames = useGameStore((state) => state.hydrateRemoteGames);
  const storageKey = `donc.mission.v1.${userId}`;
  // O card só monta depois do dashboard carregar no cliente, então ler o storage no init é seguro.
  const [stored] = useState(() => readLog(storageKey));

  useEffect(() => {
    hydrateRemoteGames();
  }, [hydrateRemoteGames]);

  const mission = useMemo(
    () => buildMission({ adaptive, games, attempts, dashboard, log: stored }),
    [adaptive, games, attempts, dashboard, stored],
  );
  const log = useMemo(() => syncMissionLog(stored, mission, dashboard.completed_lessons), [stored, mission, dashboard.completed_lessons]);

  useEffect(() => {
    if (log !== stored) writeLog(storageKey, log);
  }, [log, stored, storageKey]);

  const steps = [mission.activity, ...(mission.lesson ? [mission.lesson] : [])];
  const doneCount = steps.filter((step) => step.done).length;
  const history = log.doneDays.length;

  return (
    <section className="comfortable-card mt-4 rounded-card bg-card shadow-soft" data-testid="daily-mission">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="section-title flex items-center gap-2 font-semibold">
          <Target className="h-4 w-4 text-primary" aria-hidden="true" />
          Missão de hoje
        </h2>
        <span className="text-[13px] text-muted-foreground">
          {mission.complete ? "Missão cumprida!" : `${doneCount} de ${steps.length} passos`}
          {history > 0 ? ` · ${history} ${history === 1 ? "missão concluída" : "missões concluídas"}` : ""}
        </span>
      </div>
      <ul className="grid gap-2">
        {steps.map((step) => (
          <MissionStepRow key={step.href} step={step} />
        ))}
      </ul>
    </section>
  );
}

function MissionStepRow({ step }: { step: MissionStep }) {
  const Icon = step.done ? Check : Circle;
  return (
    <li>
      <Link
        href={step.href}
        className={cn(
          "flex min-h-11 items-center gap-3 rounded-control border border-border/60 p-3 transition-colors hover:bg-muted/60",
          step.done && "bg-primary/5",
        )}
      >
        <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full", step.done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("text-safe block truncate text-[14px] font-semibold leading-tight", step.done && "line-through opacity-70")}>{step.title}</span>
          <span className="block truncate text-[12px] text-muted-foreground">{step.description}</span>
        </span>
      </Link>
    </li>
  );
}
