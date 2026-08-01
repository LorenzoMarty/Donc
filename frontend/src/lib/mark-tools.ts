export type EssayMarkTool = "highlighter-yellow" | "highlighter-green" | "highlighter-blue" | "highlighter-pink";

export const MARK_TOOL_LABEL: Record<EssayMarkTool, string> = {
  "highlighter-yellow": "Marca-texto amarelo",
  "highlighter-green": "Marca-texto verde",
  "highlighter-blue": "Marca-texto azul",
  "highlighter-pink": "Marca-texto rosa",
};

/** Estilo do trecho marcado sobre o overlay transparente da folha (texto já colorido no fundo). */
export const MARK_TOOL_STYLE: Record<EssayMarkTool, string> = {
  "highlighter-yellow": "rounded-sm bg-[#fff3a0]/70",
  "highlighter-green": "rounded-sm bg-[#b9f6c8]/70",
  "highlighter-blue": "rounded-sm bg-[#bde0ff]/70",
  "highlighter-pink": "rounded-sm bg-[#ffc9de]/70",
};

/** Estilo do `<mark>` clicável no grifo dos textos motivadores (fundo + cursor de remover). */
export const MARK_TOOL_HIGHLIGHT_STYLE: Record<EssayMarkTool, string> = {
  "highlighter-yellow": "bg-[#fff3a0]/80",
  "highlighter-green": "bg-[#b9f6c8]/80",
  "highlighter-blue": "bg-[#bde0ff]/80",
  "highlighter-pink": "bg-[#ffc9de]/80",
};

export const PEN_SWATCHES: { tool: EssayMarkTool; color: string }[] = [
  { tool: "highlighter-yellow", color: "#fff3a0" },
  { tool: "highlighter-green", color: "#b9f6c8" },
  { tool: "highlighter-blue", color: "#bde0ff" },
  { tool: "highlighter-pink", color: "#ffc9de" },
];

/** Fallback pra grifos de motivadores persistidos antes da unificação com o Dock (sem campo `tool`). */
export const DEFAULT_MARK_TOOL: EssayMarkTool = "highlighter-yellow";
