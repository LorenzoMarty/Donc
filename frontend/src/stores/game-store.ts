"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { mapPublishedGame } from "@/features/gamification/catalog";
import { applyEvent, emptyAdaptiveProfile, eventsForOutcome, tagOutcomeToEvents } from "@/features/gamification/adaptive";
import type { CognitiveDecision } from "@/features/gamification/adaptive";
import type { SkillProfile } from "@/features/gamification/symptoms";
import type { AdaptiveProfile, CognitiveEventRecord, GameAttempt, GameCompletion, GameDefinition, GameProgress, SkillTag, StreakState } from "@/features/gamification/types";
import { todayKey, updateStreak } from "@/features/streak/streak";
import { apiFetch } from "@/lib/http-client";
import type { PublishedGame } from "@/types/api";

/**
 * Valor interno usado só para preencher o histórico de tentativas (`GameAttempt.xpEarned`) e o
 * payload de sincronização com o backend (`/games/complete`) — não existe mais total de XP nem
 * rank client-side; nada consome este número na UI.
 */
function calculateXpEarned(game: GameDefinition, isRepeatToday: boolean, accuracy: number): number {
  const accuracyMultiplier = accuracy >= 90 ? 1.15 : accuracy >= 70 ? 1 : 0.72;
  const base = Math.round(game.xpReward * accuracyMultiplier);
  if (!isRepeatToday) return base;
  return Math.max(5, Math.round(base * 0.25));
}

type GameStore = {
  streak: StreakState;
  attempts: GameAttempt[];
  progress: Record<string, GameProgress>;
  skills: SkillProfile;
  adaptive: AdaptiveProfile;
  hydrated: boolean;
  remoteGames: GameDefinition[];
  remoteGamesHydrated: boolean;
  completeGame: (game: GameDefinition, score: number, total: number, durationSeconds: number) => GameCompletion;
  recordSkillOutcomes: (entries: { tag: SkillTag; correct: boolean }[]) => void;
  recordCognitiveOutcome: (game: GameDefinition, decision: CognitiveDecision) => void;
  trackCognitiveEvent: (event: Omit<CognitiveEventRecord, "at">) => void;
  getGameProgress: (gameId: string) => GameProgress | undefined;
  hydrateFromBackend: () => Promise<void>;
  hydrateRemoteGames: () => Promise<void>;
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
      streak: initialStreak,
      attempts: [],
      progress: {},
      skills: {},
      adaptive: emptyAdaptiveProfile(),
      hydrated: false,
      remoteGames: [],
      remoteGamesHydrated: false,
      getGameProgress: (gameId) => get().progress[gameId],
      recordSkillOutcomes: (entries) => {
        if (!entries.length) return;
        const skills: SkillProfile = { ...get().skills };
        for (const { tag, correct } of entries) {
          const prev = skills[tag] ?? { attempts: 0, errors: 0 };
          skills[tag] = { attempts: prev.attempts + 1, errors: prev.errors + (correct ? 0 : 1) };
        }
        // Ponte com a camada cognitiva: traduz acerto/erro por tag em eventos com severidade.
        const events = tagOutcomeToEvents(entries, new Date().toISOString());
        const adaptive = events.reduce((profile, event) => applyEvent(profile, event), get().adaptive);
        set({ skills, adaptive });
      },
      recordCognitiveOutcome: (game, decision) => {
        const at = new Date().toISOString();
        // Camada cognitiva é a fonte principal: deriva eventos por hub a partir da qualidade.
        const events = eventsForOutcome(game, decision, at);
        const adaptive = events.reduce((profile, event) => applyEvent(profile, event), get().adaptive);
        // Compat legada: mantém attempts/errors por tag para consumidores antigos.
        let skills = get().skills;
        if (decision.tags?.length) {
          const correct = decision.grade ? decision.grade === "S" || decision.grade === "A" : !!decision.correct;
          skills = { ...skills };
          for (const tag of decision.tags) {
            const prev = skills[tag] ?? { attempts: 0, errors: 0 };
            skills[tag] = { attempts: prev.attempts + 1, errors: prev.errors + (correct ? 0 : 1) };
          }
        }
        set({ adaptive, skills });
      },
      trackCognitiveEvent: (event) => {
        set({ adaptive: applyEvent(get().adaptive, { ...event, at: new Date().toISOString() }) });
      },
      hydrateRemoteGames: async () => {
        try {
          const rows = await apiFetch<PublishedGame[]>("/games/published");
          set({ remoteGames: rows.map(mapPublishedGame), remoteGamesHydrated: true });
        } catch {
          set({ remoteGamesHydrated: true });
        }
      },
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
        const { streak, attempts, progress, skills } = get();
        const blob = new Blob([JSON.stringify({ streak, attempts, progress, skills, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `donc-progresso-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      },
      importProgress: (json) => {
        try {
          const parsed = JSON.parse(json) as { streak?: StreakState; attempts?: GameAttempt[]; progress?: Record<string, GameProgress>; skills?: SkillProfile };
          set({
            streak: parsed.streak ?? get().streak,
            attempts: Array.isArray(parsed.attempts) ? parsed.attempts : get().attempts,
            progress: parsed.progress && typeof parsed.progress === "object" ? parsed.progress : get().progress,
            skills: parsed.skills && typeof parsed.skills === "object" ? parsed.skills : get().skills,
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
        const xpEarned = calculateXpEarned(game, isRepeatToday, accuracy);
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
        set({
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

        return { attempt };
      },
    }),
    {
      name: "donk.games.v1",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      // v2: AdaptiveProfile mudou para 7 hubs pt-BR. Reinicia o perfil cognitivo preservando
      // streak/attempts/progress/skills. attempts/errors seguem só como compat legada.
      migrate: (persisted, from) => {
        const state = (persisted ?? {}) as Partial<GameStore>;
        if (from < 2) {
          return { ...state, adaptive: emptyAdaptiveProfile() };
        }
        return state;
      },
      partialize: (state) => ({
        streak: state.streak,
        attempts: state.attempts,
        progress: state.progress,
        skills: state.skills,
        adaptive: state.adaptive,
      }),
    },
  ),
);
