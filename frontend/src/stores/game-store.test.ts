import { describe, it, expect, beforeEach } from "vitest";

import { useGameStore } from "@/stores/game-store";
import { emptyAdaptiveProfile, isNegativeEvent } from "@/features/gamification/adaptive";
import { getGameById } from "@/features/gamification/catalog";
import { enrichedTestCatalog } from "@/features/gamification/catalog.test-fixtures";
import { HUB_IDS } from "@/features/gamification/symptoms";
import type { GameDefinition } from "@/features/gamification/types";

const PERSIST_KEY = "donk.games.v1";
const duel = getGameById("version-duel", enrichedTestCatalog) as GameDefinition;

function readPersisted() {
  const raw = localStorage.getItem(PERSIST_KEY);
  return raw ? JSON.parse(raw) : null;
}

beforeEach(() => {
  useGameStore.setState({
    adaptive: emptyAdaptiveProfile(),
    attempts: [],
    progress: {},
    streak: { current: 0, best: 0 },
  });
});

describe("perfil adaptativo inicial e schema", () => {
  it("inicia com os 7 hubs zerados", () => {
    const { adaptive } = useGameStore.getState();
    expect(Object.keys(adaptive.weaknessSignals).sort()).toEqual([...HUB_IDS].sort());
    expect(adaptive.recentEvents).toEqual([]);
  });

  it("persiste com a versão atual do schema (v2)", () => {
    useGameStore.getState().recordCognitiveOutcome(duel, { tags: ["texto-robotico"], grade: "A" });
    const persisted = readPersisted();
    expect(persisted.version).toBe(2);
    expect(persisted.state.adaptive).toBeTruthy();
  });
});

describe("recordCognitiveOutcome", () => {
  it("emite evento cognitivo e atualiza weaknessSignals em nota baixa", () => {
    useGameStore.getState().recordCognitiveOutcome(duel, { tags: ["texto-robotico"], grade: "Fraco" });
    const { adaptive } = useGameStore.getState();
    expect(adaptive.weaknessSignals["texto-robotico"]).toBeGreaterThan(0);
    expect(adaptive.recentEvents).toHaveLength(1);
    expect(isNegativeEvent(adaptive.recentEvents[0].type)).toBe(true);
  });

  it("nota alta gera evento positivo e sobe mastery", () => {
    useGameStore.getState().recordCognitiveOutcome(duel, { tags: ["texto-robotico"], grade: "S" });
    const { adaptive } = useGameStore.getState();
    expect(adaptive.mastery["texto-robotico"]).toBeGreaterThan(0);
    expect(isNegativeEvent(adaptive.recentEvents[0].type)).toBe(false);
  });

  it("persiste o adaptive no localStorage após a decisão", () => {
    useGameStore.getState().recordCognitiveOutcome(duel, { tags: ["texto-robotico"], grade: "Fraco" });
    const persisted = readPersisted();
    expect(persisted.state.adaptive.weaknessSignals["texto-robotico"]).toBeGreaterThan(0);
  });
});

describe("trackCognitiveEvent", () => {
  it("aplica um evento avulso ao perfil", () => {
    useGameStore.getState().trackCognitiveEvent({ type: "VAGUE_THESIS", severity: 0.8, hub: "introducao-sem-tese" });
    expect(useGameStore.getState().adaptive.weaknessSignals["introducao-sem-tese"]).toBeGreaterThan(0);
  });
});

describe("completeGame", () => {
  it("registra a tentativa no histórico", () => {
    const before = useGameStore.getState().attempts.length;
    useGameStore.getState().completeGame(duel, 6, 8, 30);
    expect(useGameStore.getState().attempts.length).toBe(before + 1);
  });
});

describe("importProgress", () => {
  it("restaura streak/attempts/progress de um JSON válido e retorna true", () => {
    const backup = JSON.stringify({
      streak: { current: 3, best: 5 },
      attempts: [],
      progress: {},
    });

    const ok = useGameStore.getState().importProgress(backup);

    expect(ok).toBe(true);
    expect(useGameStore.getState().streak).toEqual({ current: 3, best: 5 });
  });

  it("mantém o estado atual e retorna false para JSON inválido, sem lançar exceção", () => {
    useGameStore.setState({ streak: { current: 9, best: 9 } });

    const ok = useGameStore.getState().importProgress("{ isso não é json válido");

    expect(ok).toBe(false);
    expect(useGameStore.getState().streak).toEqual({ current: 9, best: 9 });
  });

  it("preserva campos ausentes no backup usando o estado atual como fallback", () => {
    useGameStore.setState({ streak: { current: 7, best: 7 } });

    const ok = useGameStore.getState().importProgress(JSON.stringify({ streak: { current: 8, best: 8 } }));

    expect(ok).toBe(true);
    expect(useGameStore.getState().streak).toEqual({ current: 8, best: 8 });
  });
});
