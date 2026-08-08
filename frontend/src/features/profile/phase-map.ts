import { MASTERY_TIER_THRESHOLDS } from "@/features/gamification/adaptive";
import { getAllGames, getRecommendedGames } from "@/features/gamification/catalog";
import type { GameProgress } from "@/features/gamification/types";

/**
 * Transformador puro do "Mapa de fases": janela limitada de jogos já jogados (ordem
 * cronológica real) seguidos pelos próximos recomendados. Sem React, testável isolado.
 */

export type PhaseNodeState = "bloqueado" | "aprendiz" | "praticante" | "mestre";

export type PhaseNode = {
  gameId: string;
  name: string;
  category: string;
  state: PhaseNodeState;
  played: boolean;
};

const WINDOW_SIZE = 10;
const PLAYED_WINDOW = 6;

export function stateForProgress(progress: number): PhaseNodeState {
  if (progress >= MASTERY_TIER_THRESHOLDS.high) return "mestre";
  if (progress >= MASTERY_TIER_THRESHOLDS.low) return "praticante";
  return "aprendiz";
}

export type PhaseMap = {
  nodes: PhaseNode[];
  nextGame: { id: string; category: string } | undefined;
};

export function buildPhaseMap(progress: Record<string, GameProgress>): PhaseMap {
  const games = getAllGames();
  const byId = new Map(games.map((game) => [game.id, game]));

  const played: PhaseNode[] = Object.values(progress)
    .filter((entry) => entry.progress > 0 && byId.has(entry.gameId))
    .sort((a, b) => (a.lastPlayedAt ?? "").localeCompare(b.lastPlayedAt ?? ""))
    .slice(-PLAYED_WINDOW)
    .map((entry) => {
      const game = byId.get(entry.gameId)!;
      return { gameId: game.id, name: game.name, category: game.category, state: stateForProgress(entry.progress), played: true };
    });

  const playedIds = new Set(played.map((node) => node.gameId));
  const recommended = getRecommendedGames(progress);
  const upcoming: PhaseNode[] = recommended
    .filter((game) => !playedIds.has(game.id))
    .slice(0, Math.max(0, WINDOW_SIZE - played.length))
    .map((game) => ({ gameId: game.id, name: game.name, category: game.category, state: "bloqueado" as const, played: false }));

  return { nodes: [...played, ...upcoming], nextGame: recommended[0] };
}
