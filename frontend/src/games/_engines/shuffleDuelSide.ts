import type { DuelRound } from "@/features/gamification/types";

/**
 * Sorteia se troca os lados a/b (e o `winner` correspondente) antes de exibir o duelo. Sem isso,
 * o rótulo "Versão A"/"Versão B" ficava colado ao dado de autoria — que tem `winner: "b"` na
 * maioria dos rounds — e o jogador aprendia a clicar sempre em "B" pelo rótulo, não pelo
 * conteúdo.
 */
export function shuffleDuelSide(round: DuelRound): DuelRound {
  if (Math.random() < 0.5) return round;
  return { ...round, a: round.b, b: round.a, winner: round.winner === "a" ? "b" : "a" };
}
