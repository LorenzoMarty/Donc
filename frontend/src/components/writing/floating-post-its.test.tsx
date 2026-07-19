import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { FloatingPostIts } from "@/components/writing/floating-post-its";
import { useHighlightsStore } from "@/stores/highlights-store";

const THEME_ID = 1;

beforeEach(() => {
  useHighlightsStore.setState({ highlightsByTheme: {} });
});

describe("FloatingPostIts", () => {
  it("não renderiza nada quando não há grifos no tema", () => {
    const { container } = render(<FloatingPostIts themeId={THEME_ID} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza um post-it flutuante por grifo do tema, posicionado sobre a folha", () => {
    useHighlightsStore.getState().addHighlight(THEME_ID, 0, "Texto 1", "trecho grifado pelo aluno");
    render(<FloatingPostIts themeId={THEME_ID} />);
    expect(screen.getByTitle("trecho grifado pelo aluno")).toBeInTheDocument();
  });

  it("edita a nota do post-it e persiste no store ao perder o foco", async () => {
    useHighlightsStore.getState().addHighlight(THEME_ID, 0, "Texto 1", "trecho grifado");
    const user = userEvent.setup();
    render(<FloatingPostIts themeId={THEME_ID} />);

    const textarea = screen.getByPlaceholderText("Sua nota...");
    await user.type(textarea, "isso conecta com a tese");
    await user.tab();

    const [highlight] = useHighlightsStore.getState().highlightsByTheme[THEME_ID];
    expect(highlight.note).toBe("isso conecta com a tese");
  });

  it("remove o post-it ao clicar no botão de remover", async () => {
    useHighlightsStore.getState().addHighlight(THEME_ID, 0, "Texto 1", "trecho grifado");
    const user = userEvent.setup();
    render(<FloatingPostIts themeId={THEME_ID} />);

    await user.click(screen.getByRole("button", { name: "Remover post-it" }));
    expect(useHighlightsStore.getState().highlightsByTheme[THEME_ID]).toHaveLength(0);
  });
});
