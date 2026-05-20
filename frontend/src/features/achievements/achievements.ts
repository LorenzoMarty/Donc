import { BadgeCheck, CalendarCheck, Flame, Gauge, Medal, ShieldCheck, Sparkles, Target, Trophy, Zap } from "lucide-react";

import type { BadgeDefinition, GameAttempt, GameProgress, StreakState } from "@/features/gamification/types";

export const badgeCatalog: BadgeDefinition[] = [
  { id: "first-clear", name: "Primeira pratica", description: "Concluiu o primeiro jogo do hub.", icon: Medal, rarity: "comum" },
  { id: "precision-90", name: "Precisao alta", description: "Fechou uma pratica com pelo menos 90% de acerto.", icon: ShieldCheck, rarity: "raro" },
  { id: "perfect-run", name: "Rodada perfeita", description: "Concluiu uma pratica com 100% de acerto.", icon: Target, rarity: "epico" },
  { id: "weekly-3", name: "Semana ativa", description: "Fez tres sessoes na semana atual.", icon: CalendarCheck, rarity: "raro" },
  { id: "weekly-5", name: "Meta semanal", description: "Fez cinco sessoes na semana atual.", icon: Trophy, rarity: "epico" },
  { id: "daily-streak-3", name: "Rotina ativa", description: "Manteve tres dias de sequencia.", icon: Flame, rarity: "raro" },
  { id: "daily-streak-7", name: "Consistencia semanal", description: "Manteve sete dias de estudo.", icon: Trophy, rarity: "epico" },
  { id: "five-games", name: "Centro de treino", description: "Concluiu cinco jogos diferentes.", icon: BadgeCheck, rarity: "epico" },
  { id: "three-dominated", name: "Dominio tecnico", description: "Dominou tres jogos com pelo menos 90% de progresso.", icon: Gauge, rarity: "epico" },
  { id: "xp-500", name: "Argumentador em marcha", description: "Acumulou 500 pontos secundarios no hub.", icon: Zap, rarity: "raro" },
  { id: "xp-1000", name: "Dominio em expansao", description: "Acumulou 1000 pontos secundarios no hub.", icon: Sparkles, rarity: "lendario" },
];

export function evaluateBadges(params: { attempts: GameAttempt[]; streak: StreakState; xp: number; currentBadges: string[]; progress?: Record<string, GameProgress> }) {
  const unlocked = new Set(params.currentBadges);
  const completedGames = new Set(params.attempts.map((attempt) => attempt.gameId));
  const weekStart = startOfWeek(new Date());
  const weeklyAttempts = params.attempts.filter((attempt) => new Date(attempt.playedAt).getTime() >= weekStart.getTime());
  const dominatedGames = Object.values(params.progress ?? {}).filter((item) => item.progress >= 90);

  if (params.attempts.length >= 1) unlocked.add("first-clear");
  if (params.attempts.some((attempt) => attempt.accuracy >= 90)) unlocked.add("precision-90");
  if (params.attempts.some((attempt) => attempt.accuracy === 100)) unlocked.add("perfect-run");
  if (weeklyAttempts.length >= 3) unlocked.add("weekly-3");
  if (weeklyAttempts.length >= 5) unlocked.add("weekly-5");
  if (params.streak.current >= 3) unlocked.add("daily-streak-3");
  if (params.streak.current >= 7) unlocked.add("daily-streak-7");
  if (completedGames.size >= 5) unlocked.add("five-games");
  if (dominatedGames.length >= 3) unlocked.add("three-dominated");
  if (params.xp >= 500) unlocked.add("xp-500");
  if (params.xp >= 1000) unlocked.add("xp-1000");

  return Array.from(unlocked);
}

export function getBadgesById(ids: string[]) {
  const idSet = new Set(ids);
  return badgeCatalog.filter((badge) => idSet.has(badge.id));
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = (day + 6) % 7;
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - diff);
  return copy;
}
