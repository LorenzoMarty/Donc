"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { mapPublishedGame } from "@/features/gamification/catalog";
import { applyEvent, emptyAdaptiveProfile, eventsForOutcome } from "@/features/gamification/adaptive";
import type { CognitiveDecision } from "@/features/gamification/adaptive";
import type { AdaptiveProfile, CognitiveEventRecord, GameAttempt, GameCompletion, GameDefinition, GameProgress, IssueUpdate, StreakState } from "@/features/gamification/types";
import { todayKey, updateStreak } from "@/features/streak/streak";
import { apiFetch } from "@/lib/http-client";
import type { PublishedGame } from "@/types/api";

type GameStore = {
  streak: StreakState;
  attempts: GameAttempt[];
  progress: Record<string, GameProgress>;
  adaptive: AdaptiveProfile;
  /** Eventos cognitivos emitidos desde o último `completeGame` — enviados ao backend como
   * `cognitive_outcomes` e limpos ao fechar a tentativa. O backend, não o cliente, decide como
   * isso afeta o perfil pedagógico do aluno. */
  pendingCognitiveEvents: CognitiveEventRecord[];
  /** Resultado da última chamada resolvida de `POST /games/complete` — populado de forma
   * assíncrona (a chamada em si é fire-and-forget); telas de resultado leem isso pra mostrar
   * feedback honesto ("evoluiu"/"continue treinando"), nunca inventado no cliente. */
  lastIssueUpdates: IssueUpdate[];
  hydrated: boolean;
  remoteGames: GameDefinition[];
  remoteGamesHydrated: boolean;
  completeGame: (game: GameDefinition, score: number, total: number, durationSeconds: number) => GameCompletion;
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
      adaptive: emptyAdaptiveProfile(),
      pendingCognitiveEvents: [],
      lastIssueUpdates: [],
      hydrated: false,
      remoteGames: [],
      remoteGamesHydrated: false,
      getGameProgress: (gameId) => get().progress[gameId],
      recordCognitiveOutcome: (game, decision) => {
        const at = new Date().toISOString();
        // Camada cognitiva é a fonte principal: deriva eventos por hub a partir da qualidade.
        const events = eventsForOutcome(game, decision, at);
        const adaptive = events.reduce((profile, event) => applyEvent(profile, event), get().adaptive);
        set({ adaptive, pendingCognitiveEvents: [...get().pendingCognitiveEvents, ...events] });
      },
      trackCognitiveEvent: (event) => {
        const record = { ...event, at: new Date().toISOString() };
        set({
          adaptive: applyEvent(get().adaptive, record),
          pendingCognitiveEvents: [...get().pendingCognitiveEvents, record],
        });
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
        const { streak, attempts, progress } = get();
        const blob = new Blob([JSON.stringify({ streak, attempts, progress, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `donc-progresso-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      },
      importProgress: (json) => {
        try {
          const parsed = JSON.parse(json) as { streak?: StreakState; attempts?: GameAttempt[]; progress?: Record<string, GameProgress> };
          set({
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
        const accuracy = total ? Math.round((score / total) * 100) : 0;
        const nextStreak = updateStreak(state.streak, dateKey);
        const nextProgressValue = Math.max(currentProgress?.progress ?? 0, accuracy);
        const attempt: GameAttempt = {
          id: `${game.id}-${Date.now()}`,
          gameId: game.id,
          category: game.category,
          score,
          total,
          accuracy,
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
        const cognitiveOutcomes = state.pendingCognitiveEvents;
        set({
          streak: nextStreak,
          attempts: nextAttempts,
          progress: nextProgress,
          pendingCognitiveEvents: [],
        });

        set({ lastIssueUpdates: [] });

        // Persistencia oficial do resultado (server authority) — o backend valida ownership,
        // limites de score/duracao e se o jogo existe/esta publicado antes de gravar a tentativa.
        // useGameStore/localStorage seguem so como cache de UI, nunca fonte de verdade.
        apiFetch<{ issue_updates: IssueUpdate[] }>("/games/complete", {
          method: "POST",
          body: JSON.stringify({
            game_id: game.id,
            score,
            total,
            duration_seconds: Math.max(1, durationSeconds),
            cognitive_outcomes: cognitiveOutcomes.map((e) => ({ hub: e.hub, event: e.type, severity: e.severity })),
          }),
        })
          .then((response) => set({ lastIssueUpdates: response.issue_updates ?? [] }))
          .catch(() => undefined);

        return { attempt };
      },
    }),
    {
      name: "donk.games.v1",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      // v2: AdaptiveProfile mudou para 7 hubs pt-BR. Reinicia o perfil cognitivo preservando
      // streak/attempts/progress.
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
        adaptive: state.adaptive,
      }),
    },
  ),
);
