import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { ACCENT_OPTIONS } from "@/lib/accent";

// WCAG AA: texto branco sobre `--primary` (= escala 600 da accent no tema claro) precisa de 4,5:1.
const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf-8");

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

function luminance([r, g, b]: [number, number, number]) {
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

describe("accent colors", () => {
  it.each(ACCENT_OPTIONS.map((option) => option.key))("%s-600 has AA contrast against white text", (key) => {
    const match = css.match(new RegExp(`--${key}-600:\\s*(\\d+)\\s+(\\d+)%\\s+(\\d+)%`));
    expect(match, `--${key}-600 não encontrado em globals.css`).not.toBeNull();
    const [, h, s, l] = match!.map(Number);
    const contrast = 1.05 / (luminance(hslToRgb(h, s, l)) + 0.05);
    expect(contrast).toBeGreaterThanOrEqual(4.5);
  });
});
