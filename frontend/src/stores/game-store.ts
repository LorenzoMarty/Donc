"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { evaluateBadges } from "@/features/achievements/achievements";
import type { GameAttempt, GameCompletion, GameDefinition, GameProgress, StreakState } from "@/features/gamification/types";
import { calculateXpReward, getRankForXp } from "@/features/xp/xp";
import { todayKey, updateStreak } from "@/features/streak/streak";

type GameStore = {
  xp: number;
  streak: StreakState;
  badges: string[];
  attempts: GameAttempt[];
  progress: Record<string, GameProgress>;
  completeGame: (game: GameDefinition, score: number, total: number, durationSeconds: number) => GameCompletion;
  getGameProgress: (gameId: string) => GameProgress | undefined;
};

const initialStreak: StreakState = {
  current: 0,
  best: 0,
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      xp: 0,
      streak: initialStreak,
      badges: [],
      attempts: [],
      progress: {},
      getGameProgress: (gameId) => get().progress[gameId],
      completeGame: (game, score, total, durationSeconds) => {
        const state = get();
        const dateKey = todayKey();
        const currentProgress = state.progress[game.id];
        const isRepeatToday = currentProgress?.lastPlayedAt?.slice(0, 10) === dateKey;
        const accuracy = total ? Math.round((score / total) * 100) : 0;
        const xpEarned = calculateXpReward(game, isRepeatToday, accuracy);
        const nextStreak = updateStreak(state.streak, dateKey);
        const nextProgressValue = Math.max(currentProgress?.progress ?? 0, accuracy);
        const attempt: GameAttempt = {
          id: `${game.id}-${Date.now()}`,
          gameId: game.id,
          category: game.category,
          score,
          total,
          accuracy,
          xpEarned,
          playedAt: new Date().toISOString(),
          durationSeconds,
        };
        const nextAttempts = [attempt, ...state.attempts].slice(0, 80);
        const nextXp = state.xp + xpEarned;
        const nextProgress = {
          ...state.progress,
          [game.id]: {
            gameId: game.id,
            plays: (currentProgress?.plays ?? 0) + 1,
            bestScore: Math.max(currentProgress?.bestScore ?? 0, score),
            bestAccuracy: Math.max(currentProgress?.bestAccuracy ?? 0, accuracy),
            progress: nextProgressValue,
            completedToday: true,
            lastPlayedAt: attempt.playedAt,
          },
        };
        const nextBadges = evaluateBadges({
          attempts: nextAttempts,
          streak: nextStreak,
          xp: nextXp,
          currentBadges: state.badges,
          progress: nextProgress,
        });
        const unlockedBadges = nextBadges.filter((badge) => !state.badges.includes(badge));
        const previousRank = getRankForXp(state.xp);
        const nextRank = getRankForXp(nextXp);

        set({
          xp: nextXp,
          streak: nextStreak,
          attempts: nextAttempts,
          progress: nextProgress,
          badges: nextBadges,
        });

        return {
          attempt,
          xpEarned,
          unlockedBadges,
          xpBefore: state.xp,
          xpAfter: nextXp,
          rankUp: previousRank.id !== nextRank.id,
          rankName: nextRank.name,
        };
      },
    }),
    {
      name: "donk.games.v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        xp: state.xp,
        streak: state.streak,
        badges: state.badges,
        attempts: state.attempts,
        progress: state.progress,
      }),
    },
  ),
);
