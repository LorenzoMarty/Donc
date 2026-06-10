// Formatadores compartilhados de moeda e tokens (centralizados p/ evitar duplicação).

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4 });

/** Centavos de real (int) → "R$ 1,23". */
export function formatBRLCents(cents: number): string {
  return BRL.format((cents ?? 0) / 100);
}

/** Micro-USD (1 USD = 1_000_000) → "$1.23". */
export function formatUSDMicros(micros: number): string {
  return USD.format((micros ?? 0) / 1_000_000);
}

/** Centavos de USD (legado) → "$1.23". */
export function formatUSDCents(cents: number): string {
  return USD.format((cents ?? 0) / 100);
}

/** Abrevia contagem de tokens: 1.2k / 3.40M. */
export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
