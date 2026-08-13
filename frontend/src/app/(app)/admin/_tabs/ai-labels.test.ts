import { describe, expect, it } from "vitest";

import { agentLabel, workflowLabel } from "./ai-labels";

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
