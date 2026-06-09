/**
 * Preferência de "letra" da interface (app-wide): tamanho e altura de linha.
 * Aplicada via variáveis CSS (`--ui-font-scale`, `--ui-line-height`) e persistida em localStorage.
 * Fonte única de verdade — o script anti-flash em `layout.tsx` espelha estes mesmos defaults/clamp.
 */

export type Appearance = { fontScale: number; lineHeight: number };

export const APPEARANCE_KEY = "donc.appearance.v1";
export const DEFAULT_APPEARANCE: Appearance = { fontScale: 1, lineHeight: 1.55 };

/** Limites de segurança (também replicados no script inline). */
const FONT_SCALE_MIN = 0.8;
const FONT_SCALE_MAX = 1.4;
const LINE_HEIGHT_MIN = 1.2;
const LINE_HEIGHT_MAX = 2;

export const FONT_SCALE_LEVELS: { label: string; value: number }[] = [
  { label: "Pequeno", value: 0.9 },
  { label: "Padrão", value: 1 },
  { label: "Grande", value: 1.12 },
  { label: "Máximo", value: 1.25 },
];

export const LINE_HEIGHT_LEVELS: { label: string; value: number }[] = [
  { label: "Compacta", value: 1.35 },
  { label: "Padrão", value: 1.55 },
  { label: "Espaçosa", value: 1.8 },
];

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/** Garante valores válidos vindos do storage. */
export function normalizeAppearance(raw: Partial<Appearance> | null | undefined): Appearance {
  return {
    fontScale: clamp(Number(raw?.fontScale ?? DEFAULT_APPEARANCE.fontScale), FONT_SCALE_MIN, FONT_SCALE_MAX),
    lineHeight: clamp(Number(raw?.lineHeight ?? DEFAULT_APPEARANCE.lineHeight), LINE_HEIGHT_MIN, LINE_HEIGHT_MAX),
  };
}

export function readAppearance(): Appearance {
  if (typeof window === "undefined") return DEFAULT_APPEARANCE;
  try {
    const raw = window.localStorage.getItem(APPEARANCE_KEY);
    if (!raw) return DEFAULT_APPEARANCE;
    return normalizeAppearance(JSON.parse(raw) as Partial<Appearance>);
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function writeAppearance(pref: Appearance): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(APPEARANCE_KEY, JSON.stringify(normalizeAppearance(pref)));
  } catch {
    // storage indisponível (modo privado/cota) — ignora, a UI segue com o valor em memória.
  }
}

/** Aplica a preferência às variáveis CSS no <html> (efeito imediato). */
export function applyAppearance(pref: Appearance): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--ui-font-scale", String(pref.fontScale));
  root.style.setProperty("--ui-line-height", String(pref.lineHeight));
}

/**
 * Snippet executado no <head> antes da pintura para evitar "flash" de tamanho ao recarregar.
 * Mantém os mesmos clamps/defaults acima — propositalmente autossuficiente (sem imports).
 */
export const APPEARANCE_INIT_SCRIPT = `(function(){try{var d=${JSON.stringify(DEFAULT_APPEARANCE)};var r=localStorage.getItem(${JSON.stringify(
  APPEARANCE_KEY,
)});var p=r?JSON.parse(r):d;function c(n,a,b){n=Number(n);return isFinite(n)?Math.min(b,Math.max(a,n)):a;}var fs=c(p&&p.fontScale,${FONT_SCALE_MIN},${FONT_SCALE_MAX})||d.fontScale;var lh=c(p&&p.lineHeight,${LINE_HEIGHT_MIN},${LINE_HEIGHT_MAX})||d.lineHeight;var e=document.documentElement;e.style.setProperty('--ui-font-scale',String(fs));e.style.setProperty('--ui-line-height',String(lh));}catch(_){}})();`;
