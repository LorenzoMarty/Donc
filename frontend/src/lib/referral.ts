const STORAGE_KEY = "donc.referral.v1";
const CODE_PATTERN = /^AMIGO-[A-Z0-9]{6}$/;

/** Guarda o código de indicação do link (?ref=AMIGO-XXXXXX) para o paywall preencher depois do cadastro. */
export function captureReferralFromUrl(search = typeof window === "undefined" ? "" : window.location.search): void {
  const code = new URLSearchParams(search).get("ref")?.trim().toUpperCase() ?? "";
  if (!CODE_PATTERN.test(code)) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // sem storage (modo privado): o aluno ainda pode digitar o código no paywall
  }
}

export function readStoredReferral(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const code = window.localStorage.getItem(STORAGE_KEY);
    return code && CODE_PATTERN.test(code) ? code : null;
  } catch {
    return null;
  }
}

export function clearStoredReferral(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignora
  }
}
