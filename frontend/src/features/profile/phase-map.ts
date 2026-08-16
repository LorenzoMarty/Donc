import { MASTERY_TIER_THRESHOLDS } from "@/features/gamification/adaptive";
import { getAllGames, getRecommendedGames } from "@/features/gamification/catalog";
import type { GameDefinition, GameProgress } from "@/features/gamification/types";

/**
 * Transformador puro do "Mapa de fases": todos os jogos do catálogo, bucketados por estado de
 * domínio. Sem React, testável isolado.
 */

export type PhaseNodeState = "bloqueado" | "aprendiz" | "praticante" | "mestre";

export type PhaseNode = {
  gameId: string;
  name: string;
  category: string;
  state: PhaseNodeState;
};

export function stateForProgress(progress: number): PhaseNodeState {
  if (progress <= 0) return "bloqueado";
  if (progress >= MASTERY_TIER_THRESHOLDS.high) return "mestre";
  if (progress >= MASTERY_TIER_THRESHOLDS.low) return "praticante";
  return "aprendiz";
}

export type PhaseMap = {
  nodes: PhaseNode[];
  nextGame: { id: string; category: string } | undefined;
};

export function buildPhaseMap(progress: Record<string, GameProgress>, games: GameDefinition[] = []): PhaseMap {
  const nodes: PhaseNode[] = getAllGames(games).map((game) => ({
    gameId: game.id,
    name: game.name,
    category: game.category,
    state: stateForProgress(progress[game.id]?.progress ?? 0),
  }));

  return { nodes, nextGame: getRecommendedGames(progress, games)[0] };
}
