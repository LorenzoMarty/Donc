import { describe, it, expect } from "vitest";

import {
  APPEARANCE_KEY,
  DEFAULT_APPEARANCE,
  applyAppearance,
  normalizeAppearance,
  readAppearance,
  writeAppearance,
} from "@/lib/appearance";

describe("appearance (preferência de letra)", () => {
  it("normaliza valores inválidos para os limites/defaults", () => {
    expect(normalizeAppearance({ fontScale: 99, lineHeight: 99 })).toEqual({ fontScale: 1.4, lineHeight: 2 });
    expect(normalizeAppearance({ fontScale: 0, lineHeight: 0 })).toEqual({ fontScale: 0.8, lineHeight: 1.2 });
    expect(normalizeAppearance(null)).toEqual(DEFAULT_APPEARANCE);
    expect(normalizeAppearance({ fontScale: Number.NaN })).toEqual({
      fontScale: 0.8,
      lineHeight: DEFAULT_APPEARANCE.lineHeight,
    });
  });

  it("read retorna default sem nada salvo e faz round-trip do write", () => {
    expect(readAppearance()).toEqual(DEFAULT_APPEARANCE);
    writeAppearance({ fontScale: 1.12, lineHeight: 1.8 });
    expect(readAppearance()).toEqual({ fontScale: 1.12, lineHeight: 1.8 });
    expect(JSON.parse(localStorage.getItem(APPEARANCE_KEY) as string)).toEqual({ fontScale: 1.12, lineHeight: 1.8 });
  });

  it("read clampa valores corrompidos no storage", () => {
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify({ fontScale: 5, lineHeight: 5 }));
    expect(readAppearance()).toEqual({ fontScale: 1.4, lineHeight: 2 });
  });

  it("applyAppearance seta as variáveis CSS no <html>", () => {
    applyAppearance({ fontScale: 1.25, lineHeight: 1.35 });
    expect(document.documentElement.style.getPropertyValue("--ui-font-scale")).toBe("1.25");
    expect(document.documentElement.style.getPropertyValue("--ui-line-height")).toBe("1.35");
  });
});
