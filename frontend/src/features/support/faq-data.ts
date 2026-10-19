export type SupportFaqItem = {
  question: string;
  answer: string;
};

// Texto base escrito pelo time de desenvolvimento; o dono precisa revisar/aprovar antes do lançamento
// (valores e prazos abaixo seguem as regras atuais do produto).
export const SUPPORT_FAQ_ITEMS: SupportFaqItem[] = [
  {
    question: "Como funciona a correção de redação por IA?",
    answer:
      "A IA avalia sua redação competência a competência, seguindo os mesmos critérios do ENEM, e devolve nota estimada com explicação de cada ponto perdido. A correção leva alguns instantes e fica salva no seu histórico.",
  },
  {
    question: "A nota da IA é igual à nota oficial do ENEM?",
    answer:
      "Não. É uma estimativa para você treinar e acompanhar sua evolução. A nota oficial depende da banca do ENEM, então use a correção como guia do que melhorar.",
  },
  {
    question: "Existe limite de redações por mês?",
    answer:
      "Cada correção tem custo de processamento, então o plano pode ter uma cota mensal de correções. Quando houver cota, você vê o contador na tela de redação e ela renova no dia 1º de cada mês.",
  },
  {
    question: "Quanto custa e como funciona a cobrança?",
    answer:
      "O plano mensal custa R$ 59 e o anual R$ 588 (equivale a R$ 49 por mês). O pagamento é processado pelo Mercado Pago e renova automaticamente. Você acompanha a próxima cobrança e o histórico em Perfil.",
  },
  {
    question: "Posso trocar de plano depois de assinar?",
    answer: "Sim, a qualquer momento pelo seu perfil. O histórico de prática e as notas continuam do mesmo jeito.",
  },
  {
    question: "Como cancelo minha assinatura?",
    answer:
      "Em Perfil, no cartão de assinatura, escolha Cancelar assinatura. Você mantém o acesso até o fim do período já pago e não é cobrado de novo.",
  },
  {
    question: "Meu pagamento foi recusado, e agora?",
    answer:
      "Você tem alguns dias de carência com o acesso mantido. Atualize a forma de pagamento pelo botão que aparece no cartão de assinatura em Perfil para não perder o acesso.",
  },
  {
    question: "Como funcionam as aulas e a trilha?",
    answer:
      "As aulas ficam organizadas em módulos. Conclua uma aula para liberar a próxima e acompanhe a barra de progresso de cada módulo na tela de Aulas.",
  },
  {
    question: "Como peço para apagar ou baixar meus dados?",
    answer:
      "Em Perfil, na seção Privacidade e dados, você baixa uma cópia dos seus dados ou exclui a conta sozinho, com confirmação de senha.",
  },
  {
    question: "Ainda não recebi resposta do meu chamado, o que faço?",
    answer:
      "Nossa equipe responde na seção Meus chamados desta página e por e-mail em até alguns dias úteis. Se demorar muito além disso, responda no próprio chamado para chamar a atenção.",
  },
];
