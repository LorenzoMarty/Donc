import { badgeCatalog, getBadgesById } from "@/features/achievements/achievements";
import { baseCategories, gamesCatalog, getGamesByCategory, masteryLabel } from "@/features/gamification/catalog";
import type { BadgeDefinition, GameAttempt, GameProgress } from "@/features/gamification/types";
import { getRankSnapshot } from "@/features/xp/xp";

export type WeeklyGoal = {
  id: string;
  label: string;
  current: number;
  target: number;
  unit: string;
  progress: number;
  completed: boolean;
};

export function buildProgressionSnapshot(params: {
  xp: number;
  attempts: GameAttempt[];
  progress: Record<string, GameProgress>;
  badgeIds: string[];
}) {
  const weekly = getWeeklyStats(params.attempts);
  const categories = getCategoryMastery(params.progress);
  const performance = getPerformanceSummary(params.attempts, params.progress);
  const unlockedBadges = getBadgesById(params.badgeIds);
  const lockedBadges = badgeCatalog.filter((badge) => !params.badgeIds.includes(badge.id));

  return {
    rank: getRankSnapshot(params.xp),
    weekly,
    weeklyGoals: getWeeklyGoals(params.attempts, params.progress),
    favorites: getFavoriteGames(params.attempts),
    dominatedCategories: categories.filter((category) => category.progress >= 70),
    categories,
    history: params.attempts.slice(0, 6),
    performance,
    unlockedBadges,
    lockedBadges,
  };
}

export function getWeeklyStats(attempts: GameAttempt[]) {
  const days = getLastSevenDays();
  const dayStats = days.map((day) => {
    const entries = attempts.filter((attempt) => attempt.playedAt.slice(0, 10) === day.key);
    const xp = entries.reduce((sum, attempt) => sum + attempt.xpEarned, 0);
    const accuracy = entries.length ? Math.round(entries.reduce((sum, attempt) => sum + attempt.accuracy, 0) / entries.length) : 0;
    return {
      ...day,
      sessions: entries.length,
      xp,
      accuracy,
    };
  });

  const weekAttempts = attempts.filter((attempt) => dayStats.some((day) => day.key === attempt.playedAt.slice(0, 10)));
  const activeDays = dayStats.filter((day) => day.sessions > 0).length;

  return {
    days: dayStats,
    attempts: weekAttempts,
    sessions: weekAttempts.length,
    activeDays,
    xp: weekAttempts.reduce((sum, attempt) => sum + attempt.xpEarned, 0),
    averageAccuracy: weekAttempts.length ? Math.round(weekAttempts.reduce((sum, attempt) => sum + attempt.accuracy, 0) / weekAttempts.length) : 0,
  };
}

export function getWeeklyGoals(attempts: GameAttempt[], progress: Record<string, GameProgress>): WeeklyGoal[] {
  const weekly = getWeeklyStats(attempts);
  const dominatedGames = Object.values(progress).filter((item) => item.progress >= 90).length;
  const highPrecision = weekly.attempts.filter((attempt) => attempt.accuracy >= 85).length;

  return [
    makeGoal("weekly-sessions", "Completar sessoes", weekly.sessions, 5, "sessoes"),
    makeGoal("active-days", "Dias ativos", weekly.activeDays, 4, "dias"),
    makeGoal("precision", "Sessoes acima de 85%", highPrecision, 3, "sessoes"),
    makeGoal("dominion", "Jogos dominados", dominatedGames, 3, "jogos"),
  ];
}

export function getFavoriteGames(attempts: GameAttempt[]) {
  const counts = new Map<string, { gameId: string; sessions: number; xp: number; bestAccuracy: number; lastPlayedAt: string }>();

  attempts.forEach((attempt) => {
    const current = counts.get(attempt.gameId) ?? {
      gameId: attempt.gameId,
      sessions: 0,
      xp: 0,
      bestAccuracy: 0,
      lastPlayedAt: attempt.playedAt,
    };
    current.sessions += 1;
    current.xp += attempt.xpEarned;
    current.bestAccuracy = Math.max(current.bestAccuracy, attempt.accuracy);
    current.lastPlayedAt = current.lastPlayedAt > attempt.playedAt ? current.lastPlayedAt : attempt.playedAt;
    counts.set(attempt.gameId, current);
  });

  return Array.from(counts.values())
    .map((item) => ({ ...item, game: gamesCatalog.find((game) => game.id === item.gameId) }))
    .filter((item) => item.game)
    .sort((a, b) => b.sessions - a.sessions || b.xp - a.xp)
    .slice(0, 4);
}

export function getCategoryMastery(progress: Record<string, GameProgress>) {
  return baseCategories
    .map((category) => {
      const games = getGamesByCategory(category.id);
      const categoryProgress = games.length ? Math.round(games.reduce((sum, game) => sum + (progress[game.id]?.progress ?? 0), 0) / games.length) : 0;
      const dominatedGames = games.filter((game) => (progress[game.id]?.progress ?? 0) >= 90).length;
      return {
        ...category,
        progress: categoryProgress,
        gameCount: games.length,
        dominatedGames,
        masteryLevel: masteryLabel(categoryProgress),
      };
    })
    .sort((a, b) => b.progress - a.progress);
}

export function getPerformanceSummary(attempts: GameAttempt[], progress: Record<string, GameProgress>) {
  const completedGames = new Set(attempts.map((attempt) => attempt.gameId));
  const totalDuration = attempts.reduce((sum, attempt) => sum + attempt.durationSeconds, 0);
  const bestAttempt = attempts.reduce<GameAttempt | null>((best, attempt) => {
    if (!best) return attempt;
    if (attempt.accuracy > best.accuracy) return attempt;
    if (attempt.accuracy === best.accuracy && attempt.xpEarned > best.xpEarned) return attempt;
    return best;
  }, null);

  return {
    sessions: attempts.length,
    completedGames: completedGames.size,
    dominatedGames: Object.values(progress).filter((item) => item.progress >= 90).length,
    averageAccuracy: attempts.length ? Math.round(attempts.reduce((sum, attempt) => sum + attempt.accuracy, 0) / attempts.length) : 0,
    averageDuration: attempts.length ? Math.round(totalDuration / attempts.length) : 0,
    bestAccuracy: bestAttempt?.accuracy ?? 0,
    bestGameId: bestAttempt?.gameId,
  };
}

export function getNextBadges(unlocked: BadgeDefinition[], limit = 4) {
  const unlockedIds = new Set(unlocked.map((badge) => badge.id));
  return badgeCatalog.filter((badge) => !unlockedIds.has(badge.id)).slice(0, limit);
}

function makeGoal(id: string, label: string, current: number, target: number, unit: string): WeeklyGoal {
  const progress = Math.min(100, Math.round((current / target) * 100));
  return {
    id,
    label,
    current,
    target,
    unit,
    progress,
    completed: current >= target,
  };
}

function getLastSevenDays() {
  const formatter = new Intl.DateTimeFormat("pt-BR", { weekday: "short" });
  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    date.setHours(0, 0, 0, 0);
    return {
      key: date.toISOString().slice(0, 10),
      label: formatter.format(date).replace(".", ""),
    };
  });
}
