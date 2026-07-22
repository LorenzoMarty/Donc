import { fireEvent, render, screen, waitFor, waitForElementToBeRemoved } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EssayEditor } from "@/components/writing/essay-editor";
import type { EssayTheme } from "@/services/api";
import { useFreePostItsStore } from "@/stores/free-post-its-store";

const THEME: EssayTheme = {
  id: 1,
  title: "Tema de teste",
  context: "Contexto do tema de teste.",
  source: "Donc ENEM",
  supporting_texts: [
    { title: "Texto motivador 1", content: "Conteúdo do texto motivador de teste.", type: "motivador" },
  ],
};

function renderEditor() {
  return render(
    <EssayEditor
      essay={null}
      theme={THEME}
      title="Rascunho"
      content="Meu texto de redação."
      wordCount={10}
      paragraphCount={1}
      saving={false}
      submitting={false}
      onTitleChange={vi.fn()}
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

  it("mostra o titulo do tema numa faixa colapsavel, sem sidebar fixa", async () => {
    const user = userEvent.setup();
    renderEditor();

    expect(screen.getByText("Tema de teste")).toBeInTheDocument();
    expect(screen.queryByText("Contexto do tema de teste.")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Tema de teste/ }));
    expect(await screen.findByText("Contexto do tema de teste.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Tema de teste/ }));
    await waitFor(() => expect(screen.queryByText("Contexto do tema de teste.")).not.toBeInTheDocument());
  });

  it("bottom bar de canetas: sublinha o trecho selecionado e depois limpa as marcações", async () => {
    renderEditor();

    const textarea = screen.getByPlaceholderText("Comece sua redação aqui...") as HTMLTextAreaElement;
    const penButton = screen.getByRole("button", { name: "Caneta azul" });
    const clearButton = screen.getByRole("button", { name: "Limpar marcações" });

    expect(clearButton).toBeDisabled();

    textarea.focus();
    textarea.setSelectionRange(0, 4);
    fireEvent.click(penButton);

    expect(clearButton).not.toBeDisabled();
    expect(screen.getByText("Meu")).toBeInTheDocument();

    fireEvent.click(clearButton);
    expect(clearButton).toBeDisabled();
  });

  it("dock: botão + cria um post-it livre no store", async () => {
    const user = userEvent.setup();
    renderEditor();

    expect(useFreePostItsStore.getState().postItsByTheme["1"] ?? []).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "Criar post-it" }));
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
        paragraphCount={1}
        saving={false}
        submitting={false}
        onTitleChange={vi.fn()}
        onContentChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "Caneta azul" })).not.toBeInTheDocument();
  });

  it("não mostra o toggle de páginas quando o tema não tem textos motivadores", () => {
    render(
      <EssayEditor
        essay={null}
        theme={{ ...THEME, supporting_texts: [] }}
        title="Rascunho"
        content=""
        wordCount={0}
        paragraphCount={0}
        saving={false}
        submitting={false}
        onTitleChange={vi.fn()}
        onContentChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "Textos motivadores" })).not.toBeInTheDocument();
  });
});
