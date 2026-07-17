import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { HydraRail } from "@/components/writing/hydra-rail";
import { useHighlightsStore } from "@/stores/highlights-store";

const THEME_ID = 1;

beforeEach(() => {
  useHighlightsStore.setState({ highlightsByTheme: {} });
});

describe("HydraRail", () => {
  it("mostra dica de grifo quando não há post-its ainda", () => {
    render(<HydraRail themeId={THEME_ID} />);
    expect(screen.getByText(/Grife um trecho/)).toBeInTheDocument();
  });

  it("lista um post-it por grifo do tema, com o trecho grifado", () => {
    useHighlightsStore.getState().addHighlight(THEME_ID, 0, "Texto 1", "trecho grifado pelo aluno");
    render(<HydraRail themeId={THEME_ID} />);
    expect(screen.getByTitle("trecho grifado pelo aluno")).toBeInTheDocument();
  });

  it("edita a nota do post-it e persiste no store ao perder o foco", async () => {
    useHighlightsStore.getState().addHighlight(THEME_ID, 0, "Texto 1", "trecho grifado");
    const user = userEvent.setup();
    render(<HydraRail themeId={THEME_ID} />);

    const textarea = screen.getByPlaceholderText("Sua nota...");
    await user.type(textarea, "isso conecta com a tese");
    await user.tab();

    const [highlight] = useHighlightsStore.getState().highlightsByTheme[THEME_ID];
    expect(highlight.note).toBe("isso conecta com a tese");
  });
});
