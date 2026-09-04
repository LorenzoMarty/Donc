import { fireEvent, render, screen, waitForElementToBeRemoved } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EssayEditor } from "@/components/writing/essay-editor";
import type { EssayTheme } from "@/services/api";
import { useFreePostItsStore } from "@/stores/free-post-its-store";

const THEME: EssayTheme = {
  id: 1,
  title: "Tema de teste",
  context: "Contexto do tema de teste.",
  source: "Donc",
  status: "approved",
  created_at: "2026-08-01T00:00:00Z",
  supporting_texts: [
    { title: "Texto motivador 1", content: "Conteúdo do texto motivador de teste.", type: "motivador" },
  ],
  essays_count: 0,
};

function renderEditor() {
  return render(
    <EssayEditor
      essay={null}
      theme={THEME}
      title="Rascunho"
      content="Meu texto de redação."
      wordCount={10}
      saving={false}
      submitting={false}
      onContentChange={vi.fn()}
      onSubmit={vi.fn()}
    />,
  );
}

describe("EssayEditor — alternância folha/motivadores", () => {
  beforeEach(() => {
    useFreePostItsStore.setState({ postItsByTheme: {} });
  });

  it("mostra a folha de redação por padrão", () => {
    renderEditor();
    expect(screen.getByPlaceholderText("Comece sua redação aqui...")).toBeInTheDocument();
  });

  it("troca para o caderno de motivadores ao clicar na aba e preserva o texto ao voltar", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole("button", { name: "Textos motivadores" }));
    await waitForElementToBeRemoved(() => screen.queryByPlaceholderText("Comece sua redação aqui..."), {
      timeout: 2000,
    });
    expect(await screen.findAllByText("Texto motivador 1")).not.toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "Folha de redação" }));
    const textarea = await screen.findByPlaceholderText("Comece sua redação aqui...", undefined, { timeout: 2000 });
    expect(textarea).toHaveValue("Meu texto de redação.");
  });

  it("mostra as abas Folha/Textos motivadores sempre que há um tema (fiel ao mock)", () => {
    renderEditor();
    expect(screen.getByRole("button", { name: "Folha de redação" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Textos motivadores" })).toBeInTheDocument();
  });

  it("marca-texto: arma a ferramenta e aplica só na seleção seguinte, depois limpa as marcações", async () => {
    renderEditor();

    const textarea = screen.getByPlaceholderText("Comece sua redação aqui...") as HTMLTextAreaElement;
    const penButton = screen.getByRole("button", { name: "Marca-texto azul" });
    const clearButton = screen.getByRole("button", { name: "Limpar folha" });

    expect(clearButton).toBeDisabled();

    fireEvent.click(penButton);
    textarea.focus();
    textarea.setSelectionRange(0, 4);
    fireEvent.pointerUp(textarea);

    expect(clearButton).not.toBeDisabled();
    expect(screen.getByText("Meu")).toBeInTheDocument();

    fireEvent.click(clearButton);
    expect(clearButton).toBeDisabled();
  });

  it("marca-texto: funciona com seleção via caneta/stylus (pointerType 'pen'), não só mouse", async () => {
    renderEditor();

    const textarea = screen.getByPlaceholderText("Comece sua redação aqui...") as HTMLTextAreaElement;
    const penButton = screen.getByRole("button", { name: "Marca-texto azul" });

    fireEvent.click(penButton);
    textarea.focus();
    textarea.setSelectionRange(0, 4);
    fireEvent.pointerUp(textarea, { pointerType: "pen" });

    expect(screen.getByText("Meu")).toBeInTheDocument();
  });

  it("dock: botão de post-it cria um post-it livre no store", async () => {
    const user = userEvent.setup();
    renderEditor();

    expect(useFreePostItsStore.getState().postItsByTheme["1"] ?? []).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "Adicionar post-it" }));
    expect(useFreePostItsStore.getState().postItsByTheme["1"]).toHaveLength(1);
  });

  it("não mostra a bottom bar de canetas quando a redação já está corrigida (bloqueada)", () => {
    render(
      <EssayEditor
        essay={{ id: 1, status: "corrected", title: "x", content: "x", theme: THEME } as never}
        theme={THEME}
        title="Rascunho"
        content="texto"
        wordCount={10}
        saving={false}
        submitting={false}
        onContentChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "Marca-texto azul" })).not.toBeInTheDocument();
  });

  it("título não é editável: mostra o texto recebido via prop e não expõe input/textbox", () => {
    renderEditor();
    expect(screen.getByLabelText("Título da redação")).toHaveTextContent("Rascunho");
    expect(screen.queryByRole("textbox", { name: "Título da redação" })).not.toBeInTheDocument();
  });

  it("mostra o toggle de páginas mesmo quando o tema não tem textos motivadores (fallback com o contexto do tema)", () => {
    render(
      <EssayEditor
        essay={null}
        theme={{ ...THEME, supporting_texts: [] }}
        title="Rascunho"
        content=""
        wordCount={0}
        saving={false}
        submitting={false}
        onContentChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Textos motivadores" })).toBeInTheDocument();
  });
});
