import { describe, it, expect } from "vitest";

import { HUB_IDS } from "@/features/gamification/symptoms";
import { emptyAdaptiveProfile, eventsForOutcome, gradeToSeverity, recommendHub } from "@/features/gamification/adaptive";
import { getAllGames, getGameById } from "@/features/gamification/catalog";
import { enrichedTestCatalog } from "@/features/gamification/catalog.test-fixtures";
import type { Grade, GameDefinition } from "@/features/gamification/types";

/**
 * Snapshots PEQUENOS e estáveis de anti-regressão. Não capturam UI — apenas as estruturas-núcleo
 * (hubs, formato do perfil, saída da recomendação, metadados das missões, feedback qualitativo).
 */

describe("anti-regressão: estruturas-núcleo", () => {
  it("lista de hubs", () => {
    expect(HUB_IDS).toMatchInlineSnapshot(`
      [
        "texto-robotico",
        "repete-ideias",
        "repertorio-nao-encaixa",
        "nao-aprofunda",
        "introducao-sem-tese",
        "perde-na-c3",
        "conclusao-formula",
      ]
    `);
  });

  it("formato do AdaptiveProfile inicial", () => {
    expect(emptyAdaptiveProfile()).toMatchInlineSnapshot(`
      {
        "mastery": {
          "conclusao-formula": 0,
          "introducao-sem-tese": 0,
          "nao-aprofunda": 0,
          "perde-na-c3": 0,
          "repertorio-nao-encaixa": 0,
          "repete-ideias": 0,
          "texto-robotico": 0,
        },
        "recentEvents": [],
        "weaknessSignals": {
          "conclusao-formula": 0,
          "introducao-sem-tese": 0,
          "nao-aprofunda": 0,
          "perde-na-c3": 0,
          "repertorio-nao-encaixa": 0,
          "repete-ideias": 0,
          "texto-robotico": 0,
        },
      }
    `);
  });

  it("saída do recommendation engine (perfil vazio)", () => {
    const rec = recommendHub(emptyAdaptiveProfile(), getAllGames(enrichedTestCatalog));
    expect({ hub: rec.hub, hasMission: rec.missionGameId !== null }).toMatchInlineSnapshot(`
      {
        "hasMission": true,
        "hub": "texto-robotico",
      }
    `);
  });

  it("mapeamento grade → severidade", () => {
    const map = (["S", "A", "B", "C", "Fraco"] as Grade[]).map((g) => [g, gradeToSeverity(g)]);
    expect(Object.fromEntries(map)).toMatchInlineSnapshot(`
      {
        "A": {
          "negative": false,
          "severity": 0.6,
        },
        "B": {
          "negative": true,
          "severity": 0.3,
        },
        "C": {
          "negative": true,
          "severity": 0.6,
        },
        "Fraco": {
          "negative": true,
          "severity": 0.9,
        },
        "S": {
          "negative": false,
          "severity": 0.9,
        },
      }
    `);
  });

  it("metadados das missões profundas (payload de contrato)", () => {
    const ids = ["version-duel", "argument-escalation", "text-surgery", "artificiality-detector", "corrector-diagnosis"];
    const meta = ids.map((id) => {
      const g = getGameById(id, enrichedTestCatalog) as GameDefinition;
      return { id: g.id, engine: g.engine, hubs: g.hubs, focus: g.cognitiveFocus };
    });
    expect(meta).toMatchInlineSnapshot(`
      [
        {
          "engine": "duel",
          "focus": [
            "diagnosis",
            "refinement",
          ],
          "hubs": [
            "texto-robotico",
            "nao-aprofunda",
          ],
          "id": "version-duel",
        },
        {
          "engine": "argument-escalation",
          "focus": [
            "progression",
            "diagnosis",
          ],
          "hubs": [
            "nao-aprofunda",
            "introducao-sem-tese",
          ],
          "id": "argument-escalation",
        },
        {
          "engine": "text-surgery",
          "focus": [
            "refinement",
            "prioritization",
            "reconstruction",
          ],
          "hubs": [
            "texto-robotico",
            "repete-ideias",
            "repertorio-nao-encaixa",
          ],
          "id": "text-surgery",
        },
        {
          "engine": "artificiality",
          "focus": [
            "diagnosis",
          ],
          "hubs": [
            "texto-robotico",
          ],
          "id": "artificiality-detector",
        },
        {
          "engine": "corrector",
          "focus": [
            "diagnosis",
            "prioritization",
          ],
          "hubs": [
            "perde-na-c3",
            "conclusao-formula",
          ],
          "id": "corrector-diagnosis",
        },
      ]
    `);
  });

  it("exemplo de feedback qualitativo (eventos emitidos por nota)", () => {
    const duel = getGameById("version-duel", enrichedTestCatalog) as GameDefinition;
    const sEvents = eventsForOutcome(duel, { tags: ["texto-robotico"], grade: "S" }, "T").map((e) => ({ type: e.type, hub: e.hub, severity: e.severity }));
    expect(sEvents).toMatchInlineSnapshot(`
      [
        {
          "hub": "texto-robotico",
          "severity": 0.9,
          "type": "NATURAL_FLOW",
        },
      ]
    `);
  });
});
