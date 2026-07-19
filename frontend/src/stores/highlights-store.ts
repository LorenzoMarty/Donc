import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type MotivadorHighlight = {
  id: string;
  textIndex: number;
  textTitle: string;
  quote: string;
  createdAt: number;
  /** Anotação do aluno (post-it) sobre o trecho grifado — opcional, editável depois do grifo. */
  note?: string;
  /** Posição do post-it flutuante sobre a folha de redação, fração 0..1 do container. */
  position: { x: number; y: number };
};

/** Posição inicial do próximo post-it: espalha em cascata pra não empilhar tudo no mesmo canto. */
function nextPostItPosition(existingCount: number): { x: number; y: number } {
  const step = existingCount % 5;
  return { x: 0.62 + step * 0.03, y: 0.06 + step * 0.09 };
}

type HighlightsStore = {
  highlightsByTheme: Record<number, MotivadorHighlight[]>;
  addHighlight: (themeId: number, textIndex: number, textTitle: string, quote: string) => void;
  removeHighlight: (themeId: number, highlightId: string) => void;
  setHighlightNote: (themeId: number, highlightId: string, note: string) => void;
  setHighlightPosition: (themeId: number, highlightId: string, position: { x: number; y: number }) => void;
};

export const useHighlightsStore = create<HighlightsStore>()(
  persist(
    (set) => ({
      highlightsByTheme: {},
      addHighlight: (themeId, textIndex, textTitle, quote) =>
        set((state) => {
          const existing = state.highlightsByTheme[themeId] ?? [];
          if (existing.some((h) => h.textIndex === textIndex && h.quote === quote)) return state;
          const highlight: MotivadorHighlight = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            textIndex,
            textTitle,
            quote,
            createdAt: Date.now(),
            position: nextPostItPosition(existing.length),
          };
          return {
            highlightsByTheme: {
              ...state.highlightsByTheme,
              [themeId]: [...existing, highlight],
            },
          };
        }),
      removeHighlight: (themeId, highlightId) =>
        set((state) => ({
          highlightsByTheme: {
            ...state.highlightsByTheme,
            [themeId]: (state.highlightsByTheme[themeId] ?? []).filter((h) => h.id !== highlightId),
          },
        })),
      setHighlightNote: (themeId, highlightId, note) =>
        set((state) => ({
          highlightsByTheme: {
            ...state.highlightsByTheme,
            [themeId]: (state.highlightsByTheme[themeId] ?? []).map((h) =>
              h.id === highlightId ? { ...h, note } : h,
            ),
          },
        })),
      setHighlightPosition: (themeId, highlightId, position) =>
        set((state) => ({
          highlightsByTheme: {
            ...state.highlightsByTheme,
            [themeId]: (state.highlightsByTheme[themeId] ?? []).map((h) =>
              h.id === highlightId ? { ...h, position } : h,
            ),
          },
        })),
    }),
    {
      name: "donk.highlights.v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
