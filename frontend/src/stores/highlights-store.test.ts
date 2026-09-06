import { beforeEach, describe, expect, it } from "vitest";

import { useHighlightsStore } from "@/stores/highlights-store";

const THEME_ID = 1;

beforeEach(() => {
  useHighlightsStore.setState({ ownerUserId: null, highlightsByTheme: {} });
});

describe("useHighlightsStore", () => {
  it("adiciona um grifo com note vazia por padrão", () => {
    useHighlightsStore.getState().addHighlight(THEME_ID, 0, "Texto 1", "trecho grifado", "highlighter-yellow");
    const [highlight] = useHighlightsStore.getState().highlightsByTheme[THEME_ID];
    expect(highlight.quote).toBe("trecho grifado");
    expect(highlight.note).toBeUndefined();
  });

  it("não duplica o mesmo grifo (mesmo textIndex + quote)", () => {
    useHighlightsStore.getState().addHighlight(THEME_ID, 0, "Texto 1", "trecho grifado", "highlighter-yellow");
    useHighlightsStore.getState().addHighlight(THEME_ID, 0, "Texto 1", "trecho grifado", "highlighter-yellow");
    expect(useHighlightsStore.getState().highlightsByTheme[THEME_ID]).toHaveLength(1);
  });

  it("setHighlightNote grava a anotação (post-it) do aluno no grifo certo", () => {
    useHighlightsStore.getState().addHighlight(THEME_ID, 0, "Texto 1", "trecho A", "highlighter-yellow");
    useHighlightsStore.getState().addHighlight(THEME_ID, 0, "Texto 1", "trecho B", "highlighter-yellow");
    const [first, second] = useHighlightsStore.getState().highlightsByTheme[THEME_ID];

    useHighlightsStore.getState().setHighlightNote(THEME_ID, first.id, "minha nota");

    const highlights = useHighlightsStore.getState().highlightsByTheme[THEME_ID];
    expect(highlights.find((h) => h.id === first.id)?.note).toBe("minha nota");
    expect(highlights.find((h) => h.id === second.id)?.note).toBeUndefined();
  });

  it("removeHighlight remove só o grifo indicado", () => {
    useHighlightsStore.getState().addHighlight(THEME_ID, 0, "Texto 1", "trecho A", "highlighter-yellow");
    useHighlightsStore.getState().addHighlight(THEME_ID, 0, "Texto 1", "trecho B", "highlighter-yellow");
    const [first] = useHighlightsStore.getState().highlightsByTheme[THEME_ID];

    useHighlightsStore.getState().removeHighlight(THEME_ID, first.id);

    const highlights = useHighlightsStore.getState().highlightsByTheme[THEME_ID];
    expect(highlights).toHaveLength(1);
    expect(highlights[0].quote).toBe("trecho B");
  });

  it("clearHighlights esvazia todos os grifos do tema", () => {
    useHighlightsStore.getState().addHighlight(THEME_ID, 0, "Texto 1", "trecho A", "highlighter-yellow");
    useHighlightsStore.getState().addHighlight(THEME_ID, 0, "Texto 1", "trecho B", "highlighter-yellow");

    useHighlightsStore.getState().clearHighlights(THEME_ID);

    expect(useHighlightsStore.getState().highlightsByTheme[THEME_ID]).toEqual([]);
  });

  it("setHighlightPosition atualiza a posição do post-it grifado", () => {
    useHighlightsStore.getState().addHighlight(THEME_ID, 0, "Texto 1", "trecho A", "highlighter-yellow");
    const [highlight] = useHighlightsStore.getState().highlightsByTheme[THEME_ID];

    useHighlightsStore.getState().setHighlightPosition(THEME_ID, highlight.id, { x: 0.3, y: 0.4 });

    expect(useHighlightsStore.getState().highlightsByTheme[THEME_ID][0].position).toEqual({ x: 0.3, y: 0.4 });
  });
});

describe("ensureOwner", () => {
  it("no primeiro login (owner null) não apaga dado pré-existente, só assume o dono", () => {
    useHighlightsStore.getState().addHighlight(THEME_ID, 0, "Tema", "trecho", "highlighter-green");

    useHighlightsStore.getState().ensureOwner(42);

    expect(useHighlightsStore.getState().ownerUserId).toBe(42);
    expect(useHighlightsStore.getState().highlightsByTheme[THEME_ID]).toHaveLength(1);
  });

  it("ao trocar de usuário, zera highlightsByTheme e assume o novo dono", () => {
    useHighlightsStore.getState().ensureOwner(1);
    useHighlightsStore.getState().addHighlight(THEME_ID, 0, "Tema", "trecho do aluno A", "highlighter-green");
    expect(useHighlightsStore.getState().highlightsByTheme[THEME_ID]).toHaveLength(1);

    useHighlightsStore.getState().ensureOwner(2);

    expect(useHighlightsStore.getState().ownerUserId).toBe(2);
    expect(useHighlightsStore.getState().highlightsByTheme).toEqual({});
  });

  it("com o mesmo usuário, não mexe no estado existente", () => {
    useHighlightsStore.getState().ensureOwner(1);
    useHighlightsStore.getState().addHighlight(THEME_ID, 0, "Tema", "trecho", "highlighter-green");

    useHighlightsStore.getState().ensureOwner(1);

    expect(useHighlightsStore.getState().highlightsByTheme[THEME_ID]).toHaveLength(1);
  });
});
