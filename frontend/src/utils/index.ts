import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formata segundos como `mm:ss`. */
export function formatMMSS(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Lê `?step=` da URL atual como inteiro não-negativo; 0 se ausente/inválido. */
export function useStepParam(): number {
  if (typeof window === "undefined") return 0;
  const raw = Number(new URLSearchParams(window.location.search).get("step") ?? "0");
  return Number.isFinite(raw) && raw >= 0 ? raw : 0;
}

/** Escurece uma cor arbitrária (hex `#rrggbb` ou `hsl(h s% l%)`) pra uso como texto pequeno sobre
 * fundo claro/tingido com a própria cor — o tom "cru" (pensado pra ícone/fundo) costuma medir
 * ~2.3-3.3:1 de contraste, abaixo do mínimo 4.5:1 do WCAG AA; reduzir a luminosidade garante >4.5:1
 * mantendo o matiz. */
export function darkenForText(color: string): string {
  const hslMatch = color.match(/^hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*\)$/i);
  if (hslMatch) {
    const [, h, s, l] = hslMatch;
    return `hsl(${h} ${s}% ${Math.max(0, Number(l) * 0.6)}%)`;
  }
  if (color.startsWith("#") && color.length === 7) {
    const channel = (offset: number) => Math.round(parseInt(color.slice(offset, offset + 2), 16) * 0.5);
    return `rgb(${channel(1)}, ${channel(3)}, ${channel(5)})`;
  }
  return color;
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
