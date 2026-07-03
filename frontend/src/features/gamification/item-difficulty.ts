import type { ItemDifficulty } from "@/features/gamification/types";

/**
 * Estampa dificuldade posicional (terços do array) em itens que ainda não têm `difficulty`
 * explícito. Proxy grosseiro (assume que arrays hand-authored já ordenam simples→complexo), não
 * curadoria real — itens com `difficulty` já setado são respeitados e não são sobrescritos.
 */
export function tagPositionalDifficulty<T extends { difficulty?: ItemDifficulty }>(items: T[]): T[] {
  const total = items.length;
  if (total === 0) return items;

  const thirdEnd = Math.ceil(total / 3);
  const twoThirdsEnd = Math.ceil((2 * total) / 3);

  return items.map((item, index) => {
    if (item.difficulty) return item;
    const difficulty: ItemDifficulty = index < thirdEnd ? "facil" : index < twoThirdsEnd ? "media" : "dificil";
    return { ...item, difficulty };
  });
}
