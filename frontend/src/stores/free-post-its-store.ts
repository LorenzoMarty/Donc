import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type FreePostIt = {
  id: string;
  note: string;
  createdAt: number;
  /** Posição do post-it livre sobre a tela inteira, fração 0..1 da viewport. */
  position: { x: number; y: number };
};

const NO_THEME_KEY = "untitled";

/** Posição inicial do próximo post-it livre: espalha em cascata pra não empilhar no mesmo canto. */
function nextFreePostItPosition(existingCount: number): { x: number; y: number } {
  const step = existingCount % 6;
  return { x: 0.08 + step * 0.03, y: 0.14 + step * 0.08 };
}

type FreePostItsStore = {
  /** Dono atual do estado persistido (id do usuário logado). Usado por `ensureOwner` pra impedir
   * que post-its de uma conta vazem pra outra no mesmo navegador via localStorage. */
  ownerUserId: number | null;
  postItsByTheme: Record<string, FreePostIt[]>;
  addPostIt: (themeId: number | null | undefined) => void;
  removePostIt: (themeId: number | null | undefined, postItId: string) => void;
  setPostItNote: (themeId: number | null | undefined, postItId: string, note: string) => void;
  setPostItPosition: (themeId: number | null | undefined, postItId: string, position: { x: number; y: number }) => void;
  /** Chamado ao resolver o usuário logado (login/registro/refresh de sessão). Se o estado
   * persistido pertence a outro usuário (ou não tem dono ainda mas o navegador já tinha dado
   * salvo), reseta pra evitar vazamento de post-its entre contas no mesmo navegador. */
  ensureOwner: (userId: number) => void;
};

function keyFor(themeId: number | null | undefined): string {
  return themeId == null ? NO_THEME_KEY : String(themeId);
}

/**
 * Post-its livres criados pelo dock (botão "+"), sem vínculo com grifo de texto motivador.
 * Espelha o schema de `highlights-store` (post-it flutuante, posição em fração 0..1), mas escopado
 * por tema separadamente pois nasce de um clique do dock, não de uma seleção de texto.
 */
export const useFreePostItsStore = create<FreePostItsStore>()(
  persist(
    (set, get) => ({
      ownerUserId: null,
      postItsByTheme: {},
      ensureOwner: (userId) => {
        const current = get().ownerUserId;
        if (current === userId) return;
        if (current !== null) {
          set({ ownerUserId: userId, postItsByTheme: {} });
          return;
        }
        set({ ownerUserId: userId });
      },
      addPostIt: (themeId) =>
        set((state) => {
          const key = keyFor(themeId);
          const existing = state.postItsByTheme[key] ?? [];
          const postIt: FreePostIt = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            note: "",
            createdAt: Date.now(),
            position: nextFreePostItPosition(existing.length),
          };
          return { postItsByTheme: { ...state.postItsByTheme, [key]: [...existing, postIt] } };
        }),
      removePostIt: (themeId, postItId) =>
        set((state) => {
          const key = keyFor(themeId);
          return {
            postItsByTheme: {
              ...state.postItsByTheme,
              [key]: (state.postItsByTheme[key] ?? []).filter((p) => p.id !== postItId),
            },
          };
        }),
      setPostItNote: (themeId, postItId, note) =>
        set((state) => {
          const key = keyFor(themeId);
          return {
            postItsByTheme: {
              ...state.postItsByTheme,
              [key]: (state.postItsByTheme[key] ?? []).map((p) => (p.id === postItId ? { ...p, note } : p)),
            },
          };
        }),
      setPostItPosition: (themeId, postItId, position) =>
        set((state) => {
          const key = keyFor(themeId);
          return {
            postItsByTheme: {
              ...state.postItsByTheme,
              [key]: (state.postItsByTheme[key] ?? []).map((p) => (p.id === postItId ? { ...p, position } : p)),
            },
          };
        }),
    }),
    {
      name: "donk.free-post-its.v1",
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
export function ensureFreePostItsStoreOwner(userId: number) {
  if (useFreePostItsStore.persist.hasHydrated()) {
    useFreePostItsStore.getState().ensureOwner(userId);
    return;
  }
  const unsubscribe = useFreePostItsStore.persist.onFinishHydration(() => {
    unsubscribe();
    useFreePostItsStore.getState().ensureOwner(userId);
  });
}
