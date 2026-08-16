import { describe, expect, it } from "vitest";

import { agentLabel, engineLabel, workflowLabel } from "./ai-labels";

describe("workflowLabel", () => {
  it("translates a known workflow to a product-language label", () => {
    expect(workflowLabel("admin_game_generation")).toBe("Geração de jogo");
  });

  it("falls back to a humanized version of unknown workflows, never the raw value", () => {
    expect(workflowLabel("some_new_workflow")).toBe("Some new workflow");
  });
});

describe("agentLabel", () => {
  it("translates a known agent to a product-language label", () => {
    expect(agentLabel("GameGeneratorAgent")).toBe("Gerador de jogo");
  });

  it("falls back to a humanized version of unknown agents, never the raw value", () => {
    expect(agentLabel("SomeNewAgent")).toBe("Some new");
  });
});

describe("engineLabel", () => {
  it("translates a known engine to a product-language label", () => {
    expect(engineLabel("text-surgery")).toBe("Cirurgia textual");
    expect(engineLabel("duel")).toBe("Duelo de versões");
  });

  it("falls back to a humanized version of unknown engines, never the raw value", () => {
    expect(engineLabel("some-new-engine")).toBe("Some new engine");
  });
});
