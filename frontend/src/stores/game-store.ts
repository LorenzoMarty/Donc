"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { GameAttempt, GameCompletion, GameDefinition, GameProgress, StreakState } from "@/features/gamification/types";
import { calculateXpReward, getRankForXp } from "@/features/xp/xp";
import { todayKey, updateStreak } from "@/features/streak/streak";
import { apiFetch } from "@/lib/http-client";

type GameStore = {
  xp: number;
  streak: StreakState;
  attempts: GameAttempt[];
  progress: Record<string, GameProgress>;
  hydrated: boolean;
  completeGame: (game: GameDefinition, score: number, total: number, durationSeconds: number) => GameCompletion;
  getGameProgress: (gameId: string) => GameProgress | undefined;
  hydrateFromBackend: () => Promise<void>;
  exportProgress: () => void;
  importProgress: (json: string) => boolean;
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
      attempts: [],
      progress: {},
      hydrated: false,
      getGameProgress: (gameId) => get().progress[gameId],
      hydrateFromBackend: async () => {
        try {
          const rows = await apiFetch<{ game_id: string; plays: number; best_score: number; best_accuracy: number; progress: number; last_played_at: string | null }[]>("/games/progress");
          const merged: Record<string, GameProgress> = { ...get().progress };
          for (const row of rows) {
            const local = merged[row.game_id];
            merged[row.game_id] = {
              gameId: row.game_id,
              plays: Math.max(local?.plays ?? 0, row.plays),
              bestScore: Math.max(local?.bestScore ?? 0, row.best_score),
              bestAccuracy: Math.max(local?.bestAccuracy ?? 0, row.best_accuracy),
              progress: Math.max(local?.progress ?? 0, row.progress),
              completedToday: local?.completedToday ?? false,
              lastPlayedAt: row.last_played_at ?? local?.lastPlayedAt ?? "",
            };
          }
          set({ progress: merged, hydrated: true });
        } catch {
          set({ hydrated: true });
        }
      },
      exportProgress: () => {
        const { xp, streak, attempts, progress } = get();
        const blob = new Blob([JSON.stringify({ xp, streak, attempts, progress, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `donc-progresso-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      },
      importProgress: (json) => {
        try {
          const parsed = JSON.parse(json) as { xp?: number; streak?: StreakState; attempts?: GameAttempt[]; progress?: Record<string, GameProgress> };
          set({
            xp: typeof parsed.xp === "number" ? parsed.xp : get().xp,
            streak: parsed.streak ?? get().streak,
            attempts: Array.isArray(parsed.attempts) ? parsed.attempts : get().attempts,
            progress: parsed.progress && typeof parsed.progress === "object" ? parsed.progress : get().progress,
          });
          return true;
        } catch {
          return false;
        }
      },
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
        const previousRank = getRankForXp(state.xp);
        const nextRank = getRankForXp(nextXp);

        set({
          xp: nextXp,
          streak: nextStreak,
          attempts: nextAttempts,
          progress: nextProgress,
        });

        // Sync to backend fire-and-forget — local store is source of truth for UI.
        apiFetch("/games/complete", {
          method: "POST",
          body: JSON.stringify({ game_id: game.id, xp_earned: xpEarned }),
        }).catch(() => undefined);
        apiFetch(`/games/progress/${game.id}`, {
          method: "PUT",
          body: JSON.stringify({
            plays: nextProgress[game.id].plays,
            best_score: nextProgress[game.id].bestScore,
            best_accuracy: nextProgress[game.id].bestAccuracy,
            progress: nextProgress[game.id].progress,
          }),
        }).catch(() => undefined);

        return {
          attempt,
          xpEarned,
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
        attempts: state.attempts,
        progress: state.progress,
      }),
    },
  ),
);
