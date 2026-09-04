import { describe, it, expect } from "vitest";

import { HUBS, HUB_IDS, symptomHubs, gamesForHub } from "@/features/gamification/symptoms";
import { getAllGames, getEnrichedCategories, enrichGame, mapPublishedGame } from "@/features/gamification/catalog";
import { enrichedTestCatalog } from "@/features/gamification/catalog.test-fixtures";
import { missionForHub } from "@/features/gamification/adaptive";
import type { SymptomHubId } from "@/features/gamification/types";
import type { PublishedGame } from "@/types/api";

const EXPECTED_HUBS: SymptomHubId[] = [
  "texto-robotico",
  "repete-ideias",
  "repertorio-nao-encaixa",
  "nao-aprofunda",
  "introducao-sem-tese",
  "perde-na-c3",
  "conclusao-formula",
];

describe("registro de hubs", () => {
  it("existem exatamente os 7 hubs esperados", () => {
    expect(HUB_IDS.sort()).toEqual([...EXPECTED_HUBS].sort());
    expect(symptomHubs).toHaveLength(7);
  });

  it("cada hub tem label pt-BR, título e descrição não vazios", () => {
    for (const id of HUB_IDS) {
      const hub = HUBS[id];
      expect(hub.label.trim().length).toBeGreaterThan(0);
      expect(hub.title.trim().length).toBeGreaterThan(0);
      expect(hub.description.trim().length).toBeGreaterThan(0);
    }
  });

  it("cada hub tem ≥1 tag, ≥1 evento negativo e 1 positivo e engines de missão", () => {
    for (const id of HUB_IDS) {
      const hub = HUBS[id];
      expect(hub.tags.length).toBeGreaterThan(0);
      expect(hub.negativeEvents.length).toBeGreaterThan(0);
      expect(hub.positiveEvents.length).toBeGreaterThan(0);
      expect(hub.missionEngines.length).toBeGreaterThan(0);
      expect(hub.cognitiveFocus.length).toBeGreaterThan(0);
    }
  });

  it("cada hub tem ao menos uma missão associada", () => {
    const games = getAllGames(enrichedTestCatalog);
    for (const id of HUB_IDS) {
      expect(missionForHub(id, games), `hub ${id} sem missão`).toBeDefined();
    }
  });
});

describe("contrato cognitivo das missões (enrichGame)", () => {
  const games = getAllGames(enrichedTestCatalog);

  it("toda missão tem hubs, skills e possibleEvents definidos", () => {
    for (const game of games) {
      expect(Array.isArray(game.hubs), `${game.id} sem hubs`).toBe(true);
      expect(Array.isArray(game.skills), `${game.id} sem skills`).toBe(true);
      expect(Array.isArray(game.possibleEvents), `${game.id} sem possibleEvents`).toBe(true);
    }
  });

  it("as 5 missões profundas estão vinculadas a pelo menos um hub", () => {
    const deepIds = [
      "version-duel",
      "argument-escalation",
      "text-surgery",
      "artificiality-detector",
      "corrector-diagnosis",
    ];
    for (const id of deepIds) {
      const game = games.find((g) => g.id === id);
      expect(game, `missão ${id} não encontrada`).toBeDefined();
      expect((game?.hubs ?? []).length).toBeGreaterThan(0);
    }
  });

  it("mapPublishedGame usa game.hubs do backend em vez de derivar de tags (jogos do banco não têm tags)", () => {
    const published: PublishedGame = {
      id: 42,
      name: "Jogo do banco",
      category: "argumentacao",
      skill: "nao-aprofunda",
      difficulty: "medium",
      engine: "quiz",
      questions: [{ prompt: "P?", options: ["a", "b"], answer_index: 0, explanation: "E" }],
      payload: null,
      description: null,
      thumbnail: null,
      estimated_time: null,
      hubs: ["nao-aprofunda"],
    };
    const game = mapPublishedGame(published);
    expect(game.hubs).toEqual(["nao-aprofunda"]);
  });

  it("mapPublishedGame ignora hub desconhecido vindo do backend (defensivo contra drift)", () => {
    const published: PublishedGame = {
      id: 43,
      name: "Jogo com hub invalido",
      category: "argumentacao",
      skill: "nao-aprofunda",
      difficulty: "medium",
      engine: "quiz",
      questions: [],
      payload: null,
      description: null,
      thumbnail: null,
      estimated_time: null,
      hubs: ["hub-que-nao-existe"],
    };
    const game = mapPublishedGame(published);
    expect(game.hubs).toEqual([]);
  });

  it("enrichGame preenche hubs/skills/possibleEvents a partir das tags", () => {
    const enriched = enrichGame({
      id: "x",
      name: "X",
      category: "coesao",
      description: "",
      difficulty: "Essencial",
      estimatedTime: "2 min",
      thumbnail: "",
      progress: 0,
      unlocked: true,
      engine: "quiz",
      skill: "",
      tags: ["texto-robotico"],
    });
    expect(enriched.hubs).toContain("texto-robotico");
    expect(enriched.skills).toContain("texto-robotico");
    expect(enriched.possibleEvents).toContain("ARTIFICIAL_TONE");
  });
});

describe("categorias como organização interna", () => {
  it("os 7 grupos de categoria continuam disponíveis", () => {
    const categories = getEnrichedCategories({}, enrichedTestCatalog);
    expect(categories).toHaveLength(7);
    expect(categories.map((c) => c.id)).toEqual(
      expect.arrayContaining(["estrutura", "coesao", "argumentacao", "repertorio", "gramatica", "competencias-enem", "desafios-diarios"]),
    );
  });

  it("toda missão ainda carrega uma category (tag interna/URL)", () => {
    for (const game of getAllGames(enrichedTestCatalog)) {
      expect(typeof game.category).toBe("string");
      expect(game.category.length).toBeGreaterThan(0);
    }
  });
});

describe("gamesForHub", () => {
  it("retorna missões cuja tag cruza com o hub", () => {
    const games = getAllGames(enrichedTestCatalog);
    const list = gamesForHub(games, HUBS["texto-robotico"]);
    expect(list.length).toBeGreaterThan(0);
  });
});
