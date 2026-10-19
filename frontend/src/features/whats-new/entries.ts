export type WhatsNewEntry = {
  /** Estável e único; a ordem do array (mais novo primeiro) define o que conta como "novidade". */
  id: string;
  date: string;
  title: string;
  description: string;
};

// Lista versionada no código (sem CMS): para anunciar algo, adicione um item NO TOPO.
export const WHATS_NEW_ENTRIES: WhatsNewEntry[] = [
  {
    id: "2026-10-13-recuperacao-de-senha",
    date: "2026-10-13",
    title: "Recuperação de senha por e-mail",
    description: "Esqueceu a senha? Em Entrar, escolha \"Esqueci minha senha\" e receba um link para criar uma nova.",
  },
  {
    id: "2026-10-13-termos-e-reembolso",
    date: "2026-10-13",
    title: "Termos, privacidade e reembolso",
    description: "As regras de uso, a política de privacidade e a de reembolso agora têm página própria, com o seu aceite registrado.",
  },
  {
    id: "2026-10-11-reenvio-sem-edicao",
    date: "2026-10-11",
    title: "Aviso imediato ao reenviar sem editar",
    description: "Se você reenviar a redação sem mudar o texto, avisamos na hora e não gastamos uma correção.",
  },
];

export const LATEST_WHATS_NEW_ID = WHATS_NEW_ENTRIES[0]?.id ?? null;

/** Há novidade quando a última entrada vista não é a mais recente (ou nunca viu nenhuma). */
export function hasUnreadWhatsNew(lastSeenId: string | null, latestId: string | null = LATEST_WHATS_NEW_ID): boolean {
  return latestId !== null && lastSeenId !== latestId;
}
