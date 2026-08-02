import { beforeEach, describe, expect, it } from "vitest";

import { useFreePostItsStore } from "@/stores/free-post-its-store";

const THEME_ID = 1;

beforeEach(() => {
  useFreePostItsStore.setState({ postItsByTheme: {} });
});

describe("useFreePostItsStore", () => {
  it("addPostIt cria um post-it com note vazia e posição inicial em cascata", () => {
    useFreePostItsStore.getState().addPostIt(THEME_ID);
    const [postIt] = useFreePostItsStore.getState().postItsByTheme[THEME_ID];
    expect(postIt.note).toBe("");
    expect(postIt.position).toEqual({ x: 0.08, y: 0.14 });
  });

  it("addPostIt com themeId nulo/indefinido agrupa sob a chave 'untitled'", () => {
    useFreePostItsStore.getState().addPostIt(null);
    useFreePostItsStore.getState().addPostIt(undefined);
    expect(useFreePostItsStore.getState().postItsByTheme.untitled).toHaveLength(2);
  });

  it("removePostIt remove só o post-it indicado", () => {
    useFreePostItsStore.getState().addPostIt(THEME_ID);
    useFreePostItsStore.getState().addPostIt(THEME_ID);
    const [first] = useFreePostItsStore.getState().postItsByTheme[THEME_ID];

    useFreePostItsStore.getState().removePostIt(THEME_ID, first.id);

    const remaining = useFreePostItsStore.getState().postItsByTheme[THEME_ID];
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).not.toBe(first.id);
  });

  it("setPostItNote grava a nota só no post-it certo", () => {
    useFreePostItsStore.getState().addPostIt(THEME_ID);
    useFreePostItsStore.getState().addPostIt(THEME_ID);
    const [first, second] = useFreePostItsStore.getState().postItsByTheme[THEME_ID];

    useFreePostItsStore.getState().setPostItNote(THEME_ID, first.id, "lembrete");

    const postIts = useFreePostItsStore.getState().postItsByTheme[THEME_ID];
    expect(postIts.find((p) => p.id === first.id)?.note).toBe("lembrete");
    expect(postIts.find((p) => p.id === second.id)?.note).toBe("");
  });

  it("setPostItPosition atualiza a posição do post-it arrastado", () => {
    useFreePostItsStore.getState().addPostIt(THEME_ID);
    const [postIt] = useFreePostItsStore.getState().postItsByTheme[THEME_ID];

    useFreePostItsStore.getState().setPostItPosition(THEME_ID, postIt.id, { x: 0.5, y: 0.6 });

    expect(useFreePostItsStore.getState().postItsByTheme[THEME_ID][0].position).toEqual({ x: 0.5, y: 0.6 });
  });
});
