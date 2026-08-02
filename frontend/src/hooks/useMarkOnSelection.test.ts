import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useMarkOnSelection } from "@/hooks/useMarkOnSelection";

describe("useMarkOnSelection", () => {
  it("chama onMark com a citação e a ferramenta quando há ferramenta armada e seleção válida", () => {
    const onMark = vi.fn();
    const onErase = vi.fn();
    const { result } = renderHook(() =>
      useMarkOnSelection({
        activeTool: "highlighter-yellow",
        getSelectedQuote: () => "trecho selecionado",
        onMark,
        onErase,
      }),
    );

    result.current();

    expect(onMark).toHaveBeenCalledWith("trecho selecionado", "highlighter-yellow");
    expect(onErase).not.toHaveBeenCalled();
  });

  it("chama onErase (não onMark) quando a ferramenta ativa é a borracha", () => {
    const onMark = vi.fn();
    const onErase = vi.fn();
    const { result } = renderHook(() =>
      useMarkOnSelection({
        activeTool: "erase",
        getSelectedQuote: () => "trecho selecionado",
        onMark,
        onErase,
      }),
    );

    result.current();

    expect(onErase).toHaveBeenCalledWith("trecho selecionado");
    expect(onMark).not.toHaveBeenCalled();
  });

  it("não faz nada quando não há ferramenta armada", () => {
    const onMark = vi.fn();
    const onErase = vi.fn();
    const { result } = renderHook(() =>
      useMarkOnSelection({
        activeTool: null,
        getSelectedQuote: () => "trecho selecionado",
        onMark,
        onErase,
      }),
    );

    result.current();

    expect(onMark).not.toHaveBeenCalled();
    expect(onErase).not.toHaveBeenCalled();
  });

  it("não faz nada quando a seleção é inválida (getSelectedQuote retorna null)", () => {
    const onMark = vi.fn();
    const onErase = vi.fn();
    const { result } = renderHook(() =>
      useMarkOnSelection({
        activeTool: "highlighter-yellow",
        getSelectedQuote: () => null,
        onMark,
        onErase,
      }),
    );

    result.current();

    expect(onMark).not.toHaveBeenCalled();
    expect(onErase).not.toHaveBeenCalled();
  });
});
