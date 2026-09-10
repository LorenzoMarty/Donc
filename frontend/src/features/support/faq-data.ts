export type SupportFaqItem = {
  question: string;
  answer: string;
};

// Placeholder — conteúdo real ainda será enviado pelo usuário (spec suporte-e-faq, REQ-2).
export const SUPPORT_FAQ_ITEMS: SupportFaqItem[] = [
  {
    question: "Como funciona a correção de redação por IA?",
    answer:
      "A IA avalia sua redação competência a competência, seguindo os mesmos critérios do ENEM, e devolve nota estimada com explicação de cada ponto perdido.",
  },
  {
    question: "Posso trocar de plano depois de assinar?",
    answer: "Sim, a qualquer momento pelo seu perfil — o histórico de prática e as notas continuam do mesmo jeito.",
  },
  {
    question: "Ainda não recebi resposta do meu chamado, o que faço?",
    answer:
      "Nossa equipe responde por e-mail em até alguns dias úteis. Se demorar muito além disso, abra um novo chamado citando o anterior.",
  },
];
