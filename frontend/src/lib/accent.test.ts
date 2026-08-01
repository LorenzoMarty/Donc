import { describe, it, expect, beforeEach } from "vitest";

import {
  ACCENT_KEY,
  ACCENT_OPTIONS,
  DEFAULT_ACCENT,
  applyAccent,
  normalizeAccent,
  readAccent,
  writeAccent,
} from "@/lib/accent";

describe("accent (cor de destaque)", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("style");
  });

  it("normaliza hex desconhecido/inválido para o default", () => {
    expect(normalizeAccent("#123456")).toBe(DEFAULT_ACCENT);
    expect(normalizeAccent(null)).toBe(DEFAULT_ACCENT);
    expect(normalizeAccent("not-a-hex")).toBe(DEFAULT_ACCENT);
  });

  it("normaliza hex conhecido mantendo o valor exato", () => {
    const blue = ACCENT_OPTIONS.find((o) => o.key === "blue")!;
    expect(normalizeAccent(blue.hex)).toBe(blue.hex);
    expect(normalizeAccent(blue.hex.toUpperCase())).toBe(blue.hex);
  });

  it("read retorna default sem nada salvo e faz round-trip do write", () => {
    expect(readAccent()).toBe(DEFAULT_ACCENT);
    const purple = ACCENT_OPTIONS.find((o) => o.key === "purple")!;
    writeAccent(purple.hex);
    expect(readAccent()).toBe(purple.hex);
    expect(localStorage.getItem(ACCENT_KEY)).toBe(purple.hex);
  });

  it("applyAccent seta --primary/--ring/--accent apontando pra escala 500 da key certa", () => {
    const teal = ACCENT_OPTIONS.find((o) => o.key === "teal")!;
    applyAccent(teal.hex);
    const root = document.documentElement.style;
    expect(root.getPropertyValue("--primary")).toBe("var(--teal-500)");
    expect(root.getPropertyValue("--ring")).toBe("var(--teal-500)");
    expect(root.getPropertyValue("--accent")).toBe("var(--teal-500)");
  });

  it("applyAccent seta toda a escala --accent-50..900 apontando pra key certa", () => {
    const orange = ACCENT_OPTIONS.find((o) => o.key === "orange")!;
    applyAccent(orange.hex);
    const root = document.documentElement.style;
    expect(root.getPropertyValue("--accent-50")).toBe("var(--orange-50)");
    expect(root.getPropertyValue("--accent-300")).toBe("var(--orange-300)");
    expect(root.getPropertyValue("--accent-900")).toBe("var(--orange-900)");
  });

  it("applyAccent com hex desconhecido cai pro verde (default)", () => {
    applyAccent("#000000");
    const root = document.documentElement.style;
    expect(root.getPropertyValue("--primary")).toBe("var(--green-500)");
    expect(root.getPropertyValue("--accent-900")).toBe("var(--green-900)");
  });

  it("ACCENT_OPTIONS tem 6 cores com key única cada", () => {
    expect(ACCENT_OPTIONS).toHaveLength(6);
    const keys = ACCENT_OPTIONS.map((o) => o.key);
    expect(new Set(keys).size).toBe(6);
  });
});
