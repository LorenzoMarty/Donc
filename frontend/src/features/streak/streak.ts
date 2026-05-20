import type { StreakState } from "@/features/gamification/types";

export function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function updateStreak(streak: StreakState, dateKey = todayKey()): StreakState {
  if (streak.lastActiveDate === dateKey) return streak;

  const yesterday = new Date(`${dateKey}T00:00:00.000Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayKey = todayKey(yesterday);
  const current = streak.lastActiveDate === yesterdayKey ? streak.current + 1 : 1;

  return {
    current,
    best: Math.max(streak.best, current),
    lastActiveDate: dateKey,
  };
}
