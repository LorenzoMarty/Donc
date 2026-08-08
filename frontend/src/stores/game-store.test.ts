import { describe, it, expect, beforeEach } from "vitest";

import { useGameStore } from "@/stores/game-store";
import { emptyAdaptiveProfile, isNegativeEvent } from "@/features/gamification/adaptive";
import { getGameById } from "@/features/gamification/catalog";
import { HUB_IDS } from "@/features/gamification/symptoms";
import type { GameDefinition } from "@/features/gamification/types";

const PERSIST_KEY = "donk.games.v1";
const duel = getGameById("version-duel") as GameDefinition;

function readPersisted() {
  const raw = localStorage.getItem(PERSIST_KEY);
  return raw ? JSON.parse(raw) : null;
}

beforeEach(() => {
  useGameStore.setState({
    skills: {},
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

  it("mantém compat legada (attempts/errors) ao registrar a decisão", () => {
    useGameStore.getState().recordCognitiveOutcome(duel, { tags: ["texto-robotico"], grade: "Fraco" });
    const stat = useGameStore.getState().skills["texto-robotico"];
    expect(stat?.attempts).toBe(1);
    expect(stat?.errors).toBe(1); // Fraco = erro na contagem legada
  });

  it("persiste o adaptive no localStorage após a decisão", () => {
    useGameStore.getState().recordCognitiveOutcome(duel, { tags: ["texto-robotico"], grade: "Fraco" });
    const persisted = readPersisted();
    expect(persisted.state.adaptive.weaknessSignals["texto-robotico"]).toBeGreaterThan(0);
  });
});

describe("recordSkillOutcomes (ponte legada)", () => {
  it("atualiza skills e também emite eventos cognitivos", () => {
    useGameStore.getState().recordSkillOutcomes([{ tag: "c2", correct: false }]);
    const state = useGameStore.getState();
    expect(state.skills["c2"]?.errors).toBe(1);
    expect(state.adaptive.weaknessSignals["repertorio-nao-encaixa"]).toBeGreaterThan(0);
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
  it("restaura streak/attempts/progress/skills de um JSON válido e retorna true", () => {
    const backup = JSON.stringify({
      streak: { current: 3, best: 5 },
      attempts: [],
      progress: {},
      skills: { "texto-robotico": { attempts: 2, errors: 1 } },
    });

    const ok = useGameStore.getState().importProgress(backup);

    expect(ok).toBe(true);
    expect(useGameStore.getState().streak).toEqual({ current: 3, best: 5 });
    expect(useGameStore.getState().skills["texto-robotico"]).toEqual({ attempts: 2, errors: 1 });
  });

  it("mantém o estado atual e retorna false para JSON inválido, sem lançar exceção", () => {
    useGameStore.setState({ streak: { current: 9, best: 9 } });

    const ok = useGameStore.getState().importProgress("{ isso não é json válido");

    expect(ok).toBe(false);
    expect(useGameStore.getState().streak).toEqual({ current: 9, best: 9 });
  });

  it("preserva campos ausentes no backup usando o estado atual como fallback", () => {
    useGameStore.setState({ streak: { current: 7, best: 7 }, skills: { "texto-robotico": { attempts: 1, errors: 0 } } });

    const ok = useGameStore.getState().importProgress(JSON.stringify({ streak: { current: 8, best: 8 } }));

    expect(ok).toBe(true);
    expect(useGameStore.getState().streak).toEqual({ current: 8, best: 8 });
    expect(useGameStore.getState().skills["texto-robotico"]).toEqual({ attempts: 1, errors: 0 });
  });
});
