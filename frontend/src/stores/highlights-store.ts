import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { EssayMarkTool } from "@/lib/mark-tools";

export type MotivadorHighlight = {
  id: string;
  textIndex: number;
  textTitle: string;
  quote: string;
  createdAt: number;
  /** Cor da caneta do Dock usada pra criar o grifo. Ausente em grifos antigos (pré-unificação com o Dock) — usar DEFAULT_MARK_TOOL. */
  tool?: EssayMarkTool;
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
  /** Dono atual do estado persistido (id do usuário logado). Usado por `ensureOwner` pra impedir
   * que grifos/anotações de uma conta vazem pra outra no mesmo navegador via localStorage. */
  ownerUserId: number | null;
  highlightsByTheme: Record<number, MotivadorHighlight[]>;
  addHighlight: (themeId: number, textIndex: number, textTitle: string, quote: string, tool: EssayMarkTool) => void;
  removeHighlight: (themeId: number, highlightId: string) => void;
  clearHighlights: (themeId: number) => void;
  setHighlightNote: (themeId: number, highlightId: string, note: string) => void;
  setHighlightPosition: (themeId: number, highlightId: string, position: { x: number; y: number }) => void;
  /** Chamado ao resolver o usuário logado (login/registro/refresh de sessão). Se o estado
   * persistido pertence a outro usuário (ou não tem dono ainda mas o navegador já tinha dado
   * salvo), reseta pra evitar vazamento de grifos/anotações entre contas no mesmo navegador. */
  ensureOwner: (userId: number) => void;
};

export const useHighlightsStore = create<HighlightsStore>()(
  persist(
    (set, get) => ({
      ownerUserId: null,
      highlightsByTheme: {},
      ensureOwner: (userId) => {
        const current = get().ownerUserId;
        if (current === userId) return;
        if (current !== null) {
          set({ ownerUserId: userId, highlightsByTheme: {} });
          return;
        }
        set({ ownerUserId: userId });
      },
      addHighlight: (themeId, textIndex, textTitle, quote, tool) =>
        set((state) => {
          const existing = state.highlightsByTheme[themeId] ?? [];
          if (existing.some((h) => h.textIndex === textIndex && h.quote === quote)) return state;
          const highlight: MotivadorHighlight = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            textIndex,
            textTitle,
            quote,
            tool,
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
      clearHighlights: (themeId) =>
        set((state) => ({
          highlightsByTheme: {
            ...state.highlightsByTheme,
            [themeId]: [],
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

/**
 * `persist` reidrata do localStorage de forma assíncrona (depois do primeiro render) e, ao
 * terminar, faz merge do estado persistido por cima do que já estiver na store — inclusive por
 * cima de um `ensureOwner` chamado antes da reidratação terminar (o que apagaria o reset). Por
 * isso `ensureOwner` nunca deve ser chamado direto em código de auth: sempre por aqui, que espera
 * a reidratação terminar antes de comparar o dono salvo com o usuário logando.
 */
export function ensureHighlightsStoreOwner(userId: number) {
  if (useHighlightsStore.persist.hasHydrated()) {
    useHighlightsStore.getState().ensureOwner(userId);
    return;
  }
  const unsubscribe = useHighlightsStore.persist.onFinishHydration(() => {
    unsubscribe();
    useHighlightsStore.getState().ensureOwner(userId);
  });
}
