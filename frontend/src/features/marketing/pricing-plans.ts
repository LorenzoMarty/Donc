/**
 * Fonte única dos 3 planos — usada por `/pricing` (detalhado) e pela landing (preview). Preços de
 * referência, produto em pré-lançamento (ver FAQ de `/pricing`): podem mudar antes do lançamento.
 */
export const PRICING_PLANS = [
  {
    name: "Início",
    price: "R$ 29",
    description: "Pra sair do zero e criar rotina de Português.",
    features: ["Trilhas básicas de Português", "Painel de progresso", "Marcos de constância"],
    featured: false,
  },
  {
    name: "Avançado",
    price: "R$ 59",
    description: "Pra quem já treina e quer evoluir a redação.",
    features: [
      "Tudo do Início",
      "Correção de redação por IA",
      "Laboratório de redação (editor + repertório)",
      "Histórico de notas por competência",
    ],
    featured: true,
  },
  {
    name: "Mentoria",
    price: "R$ 129",
    description: "Pra reta final, com acompanhamento próximo.",
    features: ["Tudo do Avançado", "Mentoria personalizada", "Plano de estudo semanal"],
    featured: false,
  },
] as const;
