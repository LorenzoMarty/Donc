import { useCallback } from "react";

import type { EssayMarkTool } from "@/lib/mark-tools";

/**
 * Fluxo compartilhado da "caneta armada": arma uma ferramenta no Dock, depois a seleção
 * seguinte no texto dispara a marcação (ou o apagamento, se a ferramenta ativa for a borracha).
 * Consumida via `onPointerUp` (não `onMouseUp`) — `pointerup` cobre mouse, touch e caneta/stylus
 * (ex.: Apple Pencil no Safari, que não dispara `mouseup` de forma confiável).
 */
export function useMarkOnSelection({
  activeTool,
  getSelectedQuote,
  onMark,
  onErase,
}: {
  activeTool: EssayMarkTool | "erase" | null | undefined;
  getSelectedQuote: () => string | null;
  onMark: (quote: string, tool: EssayMarkTool) => void;
  onErase: (quote: string) => void;
}) {
  return useCallback(() => {
    if (!activeTool) return;
    const quote = getSelectedQuote();
    if (!quote) return;
    if (activeTool === "erase") {
      onErase(quote);
      return;
    }
    onMark(quote, activeTool);
  }, [activeTool, getSelectedQuote, onMark, onErase]);
}
