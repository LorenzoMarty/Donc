/**
 * Preferência de "accent color" (app-wide): sobrescreve --primary/--ring/--accent e a escala
 * --accent-50..900 a partir de uma das 6 opções fixas, seguindo o mesmo padrão de
 * persistência/anti-flash de `src/lib/appearance.ts`.
 */

export type AccentOption = {
  label: string;
  hex: string;
  key: "green" | "blue" | "purple" | "orange" | "red" | "teal";
};

export const ACCENT_KEY = "donc.accent.v1";

const ACCENT_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

/** Paleta exata do redesign (Painel.dc.html `options`); verde é a cor de marca. */
export const ACCENT_OPTIONS: AccentOption[] = [
  { label: "Verde", hex: "#2f9e44", key: "green" },
  { label: "Azul", hex: "#0a84ff", key: "blue" },
  { label: "Roxo", hex: "#8b5cf6", key: "purple" },
  { label: "Laranja", hex: "#e6820e", key: "orange" },
  { label: "Vermelho", hex: "#e5484d", key: "red" },
  { label: "Teal", hex: "#14b8a6", key: "teal" },
];

export const DEFAULT_ACCENT = ACCENT_OPTIONS[0].hex;

/** Matiz/saturação por accent pra derivar o fundo escuro da sessão de jogo (`.dark`, ver
 * globals.css) — desaturado o bastante pra servir de superfície grande, não um chip vívido. */
const ACCENT_DARK_HS: Record<AccentOption["key"], { h: number; s: number }> = {
  green: { h: 131, s: 22 },
  blue: { h: 210, s: 30 },
  purple: { h: 258, s: 25 },
  orange: { h: 32, s: 22 },
  red: { h: 358, s: 25 },
  teal: { h: 173, s: 25 },
};

function optionForHex(hex: string | null | undefined): AccentOption {
  const lower = hex?.toLowerCase();
  return ACCENT_OPTIONS.find((option) => option.hex.toLowerCase() === lower) ?? ACCENT_OPTIONS[0];
}

export function normalizeAccent(raw: string | null | undefined): string {
  return optionForHex(raw).hex;
}

export function readAccent(): string {
  if (typeof window === "undefined") return DEFAULT_ACCENT;
  try {
    return normalizeAccent(window.localStorage.getItem(ACCENT_KEY));
  } catch {
    return DEFAULT_ACCENT;
  }
}

export function writeAccent(hex: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACCENT_KEY, normalizeAccent(hex));
  } catch {
    // storage indisponível (modo privado/cota) — ignora, a UI segue com o valor em memória.
  }
}

/** Aplica a preferência às variáveis CSS no <html> (efeito imediato: --primary/--ring/--accent-*). */
export function applyAccent(hex: string): void {
  if (typeof document === "undefined") return;
  const { key } = optionForHex(normalizeAccent(hex));
  const root = document.documentElement;
  root.style.setProperty("--primary", `var(--${key}-500)`);
  root.style.setProperty("--ring", `var(--${key}-500)`);
  root.style.setProperty("--accent", `var(--${key}-500)`);
  for (const step of ACCENT_STEPS) {
    root.style.setProperty(`--accent-${step}`, `var(--${key}-${step})`);
  }
  const dark = ACCENT_DARK_HS[key];
  root.style.setProperty("--accent-dark-h", `${dark.h}`);
  root.style.setProperty("--accent-dark-s", `${dark.s}%`);
}

/**
 * Snippet executado no <head> antes da pintura para evitar "flash" da cor padrão ao recarregar.
 * Autossuficiente (sem imports) — mesma abordagem de `APPEARANCE_INIT_SCRIPT`.
 */
export const ACCENT_INIT_SCRIPT = `(function(){try{
var d=${JSON.stringify(DEFAULT_ACCENT)};
var map=${JSON.stringify(Object.fromEntries(ACCENT_OPTIONS.map((o) => [o.hex.toLowerCase(), o.key])))};
var dark=${JSON.stringify(ACCENT_DARK_HS)};
var raw=localStorage.getItem(${JSON.stringify(ACCENT_KEY)});
var hex=(raw&&map[String(raw).toLowerCase()])?raw:d;
var key=map[hex.toLowerCase()]||'green';
var steps=[50,100,200,300,400,500,600,700,800,900];
var e=document.documentElement;
e.style.setProperty('--primary','var(--'+key+'-500)');
e.style.setProperty('--ring','var(--'+key+'-500)');
e.style.setProperty('--accent','var(--'+key+'-500)');
for(var i=0;i<steps.length;i++){e.style.setProperty('--accent-'+steps[i],'var(--'+key+'-'+steps[i]+')');}
e.style.setProperty('--accent-dark-h',String(dark[key].h));
e.style.setProperty('--accent-dark-s',dark[key].s+'%');
}catch(_){}})();`;
