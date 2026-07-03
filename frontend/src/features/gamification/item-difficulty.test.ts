import { describe, expect, it } from "vitest";

import { tagPositionalDifficulty } from "@/features/gamification/item-difficulty";
import type { ItemDifficulty } from "@/features/gamification/types";

function item(id: string, difficulty?: ItemDifficulty) {
  return { id, difficulty };
}

describe("tagPositionalDifficulty", () => {
  it("array vazio retorna vazio", () => {
    expect(tagPositionalDifficulty([])).toEqual([]);
  });

  it("divide em terços: fácil, média, difícil", () => {
    const items = Array.from({ length: 9 }, (_, i) => item(`i${i}`));
    const tagged = tagPositionalDifficulty(items);
    expect(tagged.slice(0, 3).map((i) => i.difficulty)).toEqual(["facil", "facil", "facil"]);
    expect(tagged.slice(3, 6).map((i) => i.difficulty)).toEqual(["media", "media", "media"]);
    expect(tagged.slice(6, 9).map((i) => i.difficulty)).toEqual(["dificil", "dificil", "dificil"]);
  });

  it("respeita difficulty já setada, não sobrescreve", () => {
    const items = [item("a", "dificil"), item("b"), item("c")];
    const tagged = tagPositionalDifficulty(items);
    expect(tagged[0].difficulty).toBe("dificil");
    expect(tagged[1].difficulty).toBe("media");
  });

  it("N < 3 não quebra (arredonda para cima)", () => {
    const tagged1 = tagPositionalDifficulty([item("a")]);
    expect(tagged1[0].difficulty).toBe("facil");

    const tagged2 = tagPositionalDifficulty([item("a"), item("b")]);
    expect(tagged2.map((i) => i.difficulty)).toEqual(["facil", "media"]);
  });
});
