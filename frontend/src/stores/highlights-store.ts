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
};

type HighlightsStore = {
  highlightsByTheme: Record<number, MotivadorHighlight[]>;
  addHighlight: (themeId: number, textIndex: number, textTitle: string, quote: string) => void;
  removeHighlight: (themeId: number, highlightId: string) => void;
  setHighlightNote: (themeId: number, highlightId: string, note: string) => void;
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
    }),
    {
      name: "donk.highlights.v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
