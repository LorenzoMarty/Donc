import { describe, expect, it } from "vitest";

import { shuffleDuelSide } from "@/games/_engines/shuffleDuelSide";
import type { DuelRound } from "@/features/gamification/types";

const ROUND: DuelRound = {
  id: "d1",
  context: "ctx",
  a: "texto A",
  b: "texto B",
  winner: "b",
  dimension: "dim",
  explanation: "exp",
};

describe("shuffleDuelSide", () => {
  it("o texto do winner é sempre o texto originalmente vencedor (conteúdo não muda, só o lado)", () => {
    for (let i = 0; i < 50; i++) {
      const presented = shuffleDuelSide(ROUND);
      const winnerText = presented.winner === "a" ? presented.a : presented.b;
      expect(winnerText).toBe(ROUND.b); // ROUND.winner é "b", ou seja o texto vencedor é ROUND.b
    }
  });

  it("não fica sempre no mesmo lado — o winner varia entre 'a' e 'b' ao longo de várias chamadas", () => {
    const winners = new Set<string>();
    for (let i = 0; i < 200; i++) {
      winners.add(shuffleDuelSide(ROUND).winner);
    }
    expect(winners.has("a")).toBe(true);
    expect(winners.has("b")).toBe(true);
  });

  it("quando troca de lado, o conteúdo de a/b também troca (não só o campo winner)", () => {
    const results = Array.from({ length: 100 }, () => shuffleDuelSide(ROUND));
    const swapped = results.find((r) => r.winner === "a");
    expect(swapped).toBeDefined();
    expect(swapped?.a).toBe(ROUND.b);
    expect(swapped?.b).toBe(ROUND.a);

    const unswapped = results.find((r) => r.winner === "b");
    expect(unswapped).toBeDefined();
    expect(unswapped?.a).toBe(ROUND.a);
    expect(unswapped?.b).toBe(ROUND.b);
  });
});
