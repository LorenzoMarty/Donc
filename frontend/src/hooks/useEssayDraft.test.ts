import { describe, expect, it } from "vitest";

import { computeEssayTitle, countParagraphs, countWords } from "@/hooks/useEssayDraft";
import type { EssayTheme } from "@/services/api";

const THEME: EssayTheme = {
  id: 1,
  title: "Desafios da educação digital no Brasil",
  context: "Contexto do tema.",
  source: "Donc",
  status: "approved",
};

describe("computeEssayTitle", () => {
  it("retorna string vazia quando não há tema selecionado", () => {
    expect(computeEssayTitle(null, null)).toBe("");
  });

  it("retorna só o título do tema enquanto não há redação (rascunho novo)", () => {
    expect(computeEssayTitle(THEME, null)).toBe("Desafios da educação digital no Brasil");
  });

  it("retorna só o título do tema enquanto a redação está em rascunho/enviada (ainda não corrigida)", () => {
    expect(
      computeEssayTitle(THEME, { id: 7, status: "submitted", submitted_at: "2026-08-02T10:00:00Z", updated_at: "2026-08-02T10:00:00Z" }),
    ).toBe("Desafios da educação digital no Brasil");
  });

  it("acrescenta data e nº da redação quando a correção está pronta", () => {
    expect(
      computeEssayTitle(THEME, { id: 7, status: "corrected", submitted_at: "2026-08-02T10:00:00Z", updated_at: "2026-08-02T11:00:00Z" }),
    ).toBe("Desafios da educação digital no Brasil — 02/08/2026 — nº7");
  });

  it("usa updated_at como fallback quando não há submitted_at", () => {
    expect(computeEssayTitle(THEME, { id: 9, status: "corrected", submitted_at: null, updated_at: "2026-01-15T08:00:00Z" })).toBe(
      "Desafios da educação digital no Brasil — 15/01/2026 — nº9",
    );
  });
});

describe("countWords", () => {
  it("conta palavras separadas por espaço", () => {
    expect(countWords("uma frase de teste")).toBe(4);
  });

  it("retorna 0 para texto vazio", () => {
    expect(countWords("   ")).toBe(0);
  });
});

describe("countParagraphs", () => {
  it("conta parágrafos separados por linha em branco", () => {
    expect(countParagraphs("primeiro parágrafo\n\nsegundo parágrafo")).toBe(2);
  });

  it("retorna 0 para texto vazio", () => {
    expect(countParagraphs("")).toBe(0);
  });
});
