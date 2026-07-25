/**
 * Preferência de "accent color" (app-wide): sobrescreve --primary/--ring a partir de um hex,
 * seguindo o mesmo padrão de persistência/anti-flash de `src/lib/appearance.ts`.
 */

export type AccentOption = { label: string; hex: string };

export const ACCENT_KEY = "donc.accent.v1";

/** Paleta exata do redesign (Painel.dc.html `options`); verde é a cor de marca. */
export const ACCENT_OPTIONS: AccentOption[] = [
  { label: "Verde", hex: "#2f9e44" },
  { label: "Azul", hex: "#0a84ff" },
  { label: "Roxo", hex: "#8b5cf6" },
  { label: "Laranja", hex: "#e6820e" },
  { label: "Vermelho", hex: "#e5484d" },
  { label: "Teal", hex: "#14b8a6" },
];

export const DEFAULT_ACCENT = ACCENT_OPTIONS[0].hex;

function isValidHex(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

/** Converte hex para "H S% L%" (formato usado pelos tokens HSL em globals.css). */
export function hexToHslTriplet(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function normalizeAccent(raw: string | null | undefined): string {
  return raw && isValidHex(raw) ? raw : DEFAULT_ACCENT;
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

/** Aplica a preferência às variáveis CSS no <html> (efeito imediato: --primary/--ring/--accent). */
export function applyAccent(hex: string): void {
  if (typeof document === "undefined") return;
  const triplet = hexToHslTriplet(normalizeAccent(hex));
  const root = document.documentElement;
  root.style.setProperty("--primary", triplet);
  root.style.setProperty("--ring", triplet);
  root.style.setProperty("--accent", triplet);
}

/**
 * Snippet executado no <head> antes da pintura para evitar "flash" da cor padrão ao recarregar.
 * Autossuficiente (sem imports) — mesma abordagem de `APPEARANCE_INIT_SCRIPT`.
 */
export const ACCENT_INIT_SCRIPT = `(function(){try{var d=${JSON.stringify(
  DEFAULT_ACCENT,
)};var raw=localStorage.getItem(${JSON.stringify(ACCENT_KEY)});var hex=(raw&&/^#[0-9a-fA-F]{6}$/.test(raw))?raw:d;
function hexToHsl(hex){var r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255;
var max=Math.max(r,g,b),min=Math.min(r,g,b),l=(max+min)/2,h=0,s=0;
if(max!==min){var d2=max-min;s=l>0.5?d2/(2-max-min):d2/(max+min);
switch(max){case r:h=(g-b)/d2+(g<b?6:0);break;case g:h=(b-r)/d2+2;break;default:h=(r-g)/d2+4;}h/=6;}
return Math.round(h*360)+' '+Math.round(s*100)+'% '+Math.round(l*100)+'%';}
var t=hexToHsl(hex);var e=document.documentElement;e.style.setProperty('--primary',t);e.style.setProperty('--ring',t);e.style.setProperty('--accent',t);}catch(_){}})();`;
