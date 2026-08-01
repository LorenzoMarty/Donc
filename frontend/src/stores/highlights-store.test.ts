import { beforeEach, describe, expect, it } from "vitest";

import { useHighlightsStore } from "@/stores/highlights-store";

const THEME_ID = 1;

beforeEach(() => {
  useHighlightsStore.setState({ highlightsByTheme: {} });
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
});
