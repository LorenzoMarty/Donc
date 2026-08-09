import { describe, it, expect } from "vitest";

import {
  applyEvent,
  deriveHubsFromTags,
  dominantWeakness,
  emptyAdaptiveProfile,
  eventsForOutcome,
  gradeToSeverity,
  isNegativeEvent,
  masteryForHub,
  possibleEventsForHubs,
  rankHubsByWeakness,
  recommendHub,
  selectItemsBySkill,
  tagOutcomeToEvents,
} from "@/features/gamification/adaptive";
import { HUBS, HUB_IDS } from "@/features/gamification/symptoms";
import type { CognitiveEventRecord, GameDefinition, ItemDifficulty } from "@/features/gamification/types";

const AT = "2026-06-07T00:00:00.000Z";

/** Missão mínima para os testes do contrato cognitivo. */
function fakeGame(overrides: Partial<GameDefinition> = {}): GameDefinition {
  return {
    id: "fake",
    name: "Fake",
    category: "argumentacao",
    description: "",
    difficulty: "Avancado",
    estimatedTime: "5 min",
    thumbnail: "",
    progress: 0,
    unlocked: true,
    engine: "duel",
    skill: "",
    tags: ["texto-robotico"],
    hubs: ["texto-robotico"],
    ...overrides,
  };
}

describe("emptyAdaptiveProfile", () => {
  it("cria perfil com os 7 hubs zerados e sem eventos", () => {
    const p = emptyAdaptiveProfile();
    expect(Object.keys(p.weaknessSignals).sort()).toEqual([...HUB_IDS].sort());
    expect(Object.keys(p.mastery).sort()).toEqual([...HUB_IDS].sort());
    expect(Object.values(p.weaknessSignals).every((v) => v === 0)).toBe(true);
    expect(Object.values(p.mastery).every((v) => v === 0)).toBe(true);
    expect(p.recentEvents).toEqual([]);
  });
});

describe("gradeToSeverity", () => {
  it("S e A são positivos; B/C/Fraco são negativos com severidade crescente", () => {
    expect(gradeToSeverity("S")).toEqual({ negative: false, severity: 0.9 });
    expect(gradeToSeverity("A").negative).toBe(false);
    expect(gradeToSeverity("B").negative).toBe(true);
    expect(gradeToSeverity("C").negative).toBe(true);
    expect(gradeToSeverity("Fraco")).toEqual({ negative: true, severity: 0.9 });
  });
});

describe("isNegativeEvent", () => {
  it("classifica eventos negativos e positivos", () => {
    expect(isNegativeEvent("ARTIFICIAL_TONE")).toBe(true);
    expect(isNegativeEvent("SHALLOW_ARGUMENT")).toBe(true);
    expect(isNegativeEvent("NATURAL_FLOW")).toBe(false);
    expect(isNegativeEvent("DEEP_ARGUMENT")).toBe(false);
  });
});

describe("applyEvent", () => {
  it("evento negativo sobe weaknessSignals e derruba mastery do hub", () => {
    const ev: CognitiveEventRecord = { type: "ARTIFICIAL_TONE", severity: 0.8, hub: "texto-robotico", at: AT };
    const next = applyEvent(emptyAdaptiveProfile(), ev);
    expect(next.weaknessSignals["texto-robotico"]).toBeGreaterThan(0);
    expect(next.recentEvents[0]).toEqual(ev);
  });

  it("evento positivo sobe mastery e mantém weakness baixa", () => {
    const ev: CognitiveEventRecord = { type: "NATURAL_FLOW", severity: 0.9, hub: "texto-robotico", at: AT };
    const next = applyEvent(emptyAdaptiveProfile(), ev);
    expect(next.mastery["texto-robotico"]).toBeGreaterThan(0);
    expect(next.weaknessSignals["texto-robotico"]).toBe(0);
  });

  it("é puro: não muta o perfil de entrada", () => {
    const base = emptyAdaptiveProfile();
    applyEvent(base, { type: "ARTIFICIAL_TONE", severity: 0.5, hub: "texto-robotico", at: AT });
    expect(base.weaknessSignals["texto-robotico"]).toBe(0);
    expect(base.recentEvents).toHaveLength(0);
  });

  it("mantém os sinais dentro dos limites (0..1 e 0..100)", () => {
    let p = emptyAdaptiveProfile();
    for (let i = 0; i < 50; i++) {
      p = applyEvent(p, { type: "ARTIFICIAL_TONE", severity: 1, hub: "texto-robotico", at: AT });
    }
    expect(p.weaknessSignals["texto-robotico"]).toBeLessThanOrEqual(1);
    expect(p.mastery["texto-robotico"]).toBeGreaterThanOrEqual(0);
  });

  it("limita o histórico de eventos (cap 40)", () => {
    let p = emptyAdaptiveProfile();
    for (let i = 0; i < 60; i++) {
      p = applyEvent(p, { type: "NATURAL_FLOW", severity: 0.5, hub: "texto-robotico", at: AT });
    }
    expect(p.recentEvents.length).toBeLessThanOrEqual(40);
  });
});

describe("deriveHubsFromTags / possibleEventsForHubs", () => {
  it("mapeia tags conhecidas para seus hubs", () => {
    expect(deriveHubsFromTags(["texto-robotico"])).toContain("texto-robotico");
    expect(deriveHubsFromTags(["c2"])).toContain("repertorio-nao-encaixa");
    expect(deriveHubsFromTags(["argumentacao-rasa"])).toContain("nao-aprofunda");
  });

  it("ignora tags sem hub", () => {
    expect(deriveHubsFromTags(["crase", "regencia"])).toEqual([]);
  });

  it("possibleEventsForHubs une eventos negativos e positivos", () => {
    const events = possibleEventsForHubs(["texto-robotico"]);
    expect(events).toEqual(expect.arrayContaining(["ARTIFICIAL_TONE", "GENERIC_SENTENCE", "NATURAL_FLOW"]));
  });
});

describe("eventsForOutcome", () => {
  it("usa o grade para definir polaridade e severidade", () => {
    const game = fakeGame();
    const good = eventsForOutcome(game, { tags: ["texto-robotico"], grade: "S" }, AT);
    expect(good).toHaveLength(1);
    expect(good[0].type).toBe("NATURAL_FLOW");
    expect(good[0].severity).toBe(0.9);

    const bad = eventsForOutcome(game, { tags: ["texto-robotico"], grade: "Fraco" }, AT);
    expect(bad[0].type).toBe("ARTIFICIAL_TONE");
    expect(isNegativeEvent(bad[0].type)).toBe(true);
  });

  it("cai para correct boolean quando não há grade", () => {
    const game = fakeGame();
    const right = eventsForOutcome(game, { tags: ["texto-robotico"], correct: true }, AT);
    expect(isNegativeEvent(right[0].type)).toBe(false);
    const wrong = eventsForOutcome(game, { tags: ["texto-robotico"], correct: false }, AT);
    expect(isNegativeEvent(wrong[0].type)).toBe(true);
  });

  it("usa game.hubs quando a decisão não traz tags", () => {
    const game = fakeGame({ tags: [], hubs: ["nao-aprofunda"] });
    const events = eventsForOutcome(game, { correct: false }, AT);
    expect(events[0].hub).toBe("nao-aprofunda");
  });
});

describe("tagOutcomeToEvents (ponte legada)", () => {
  it("traduz {tag, correct} em eventos por hub", () => {
    const events = tagOutcomeToEvents([{ tag: "c2", correct: false }], AT);
    expect(events).toHaveLength(1);
    expect(events[0].hub).toBe("repertorio-nao-encaixa");
    expect(isNegativeEvent(events[0].type)).toBe(true);
  });
});

describe("dominantWeakness / recommendHub / masteryForHub", () => {
  it("perfil vazio recomenda diagnóstico inicial", () => {
    const rec = recommendHub(emptyAdaptiveProfile(), []);
    expect(rec.hub).toBe("texto-robotico");
    expect(rec.reason).toMatch(/diagnóstico/i);
  });

  it("recomenda o hub com maior sinal de fraqueza", () => {
    let p = emptyAdaptiveProfile();
    for (let i = 0; i < 5; i++) {
      p = applyEvent(p, { type: "SHALLOW_ARGUMENT", severity: 0.9, hub: "nao-aprofunda", at: AT });
    }
    expect(dominantWeakness(p)).toBe("nao-aprofunda");
    const game = fakeGame({ id: "esc", engine: "argument-escalation", hubs: ["nao-aprofunda"] });
    const rec = recommendHub(p, [game]);
    expect(rec.hub).toBe("nao-aprofunda");
    expect(rec.missionGameId).toBe("esc");
    expect(rec.reason).toBe(HUBS["nao-aprofunda"].weaknessNarrative);
  });

  it("masteryForHub lê a maestria contínua do hub", () => {
    const p = applyEvent(emptyAdaptiveProfile(), { type: "NATURAL_FLOW", severity: 1, hub: "texto-robotico", at: AT });
    expect(masteryForHub(p, "texto-robotico")).toBeGreaterThan(0);
  });
});

/** Item mínimo tipado para os testes de selectItemsBySkill. */
function fakeItem(id: string, difficulty?: ItemDifficulty): { id: string; difficulty?: ItemDifficulty } {
  return { id, difficulty };
}

describe("rankHubsByWeakness", () => {
  it("ordena todos os hubs, mais fraco primeiro", () => {
    let p = emptyAdaptiveProfile();
    p = applyEvent(p, { type: "SHALLOW_ARGUMENT", severity: 0.9, hub: "nao-aprofunda", at: AT });
    const ranked = rankHubsByWeakness(p);
    expect(ranked).toHaveLength(HUB_IDS.length);
    expect(ranked[0]).toBe("nao-aprofunda");
  });

  it("perfil vazio ainda retorna todos os hubs (ordem estável por desempate de mastery)", () => {
    const ranked = rankHubsByWeakness(emptyAdaptiveProfile());
    expect(ranked.sort()).toEqual([...HUB_IDS].sort());
  });
});

describe("selectItemsBySkill", () => {
  const items = [
    fakeItem("f1", "facil"),
    fakeItem("f2", "facil"),
    fakeItem("m1", "media"),
    fakeItem("m2", "media"),
    fakeItem("d1", "dificil"),
    fakeItem("d2", "dificil"),
  ];

  it("prioriza itens fáceis quando mastery é baixa", () => {
    const picked = selectItemsBySkill(items, 10, 2);
    expect(picked).toHaveLength(2);
    expect(picked.every((i) => i.difficulty === "facil")).toBe(true);
  });

  it("prioriza itens difíceis quando mastery é alta", () => {
    const picked = selectItemsBySkill(items, 90, 2);
    expect(picked.every((i) => i.difficulty === "dificil")).toBe(true);
  });

  it("retorna em ordem fácil→difícil (progressão dentro da sessão)", () => {
    const picked = selectItemsBySkill(items, 90, 6);
    const order = { facil: 0, media: 1, dificil: 2 } as const;
    const diffs = picked.map((i) => order[i.difficulty ?? "media"]);
    expect(diffs).toEqual([...diffs].sort((a, b) => a - b));
  });

  it("faz clamp quando count excede o pool", () => {
    const picked = selectItemsBySkill(items, 50, 100);
    expect(picked).toHaveLength(items.length);
  });

  it("array vazio retorna vazio", () => {
    expect(selectItemsBySkill([], 50, 4)).toEqual([]);
  });
});

