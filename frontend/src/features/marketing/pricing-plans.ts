/**
 * Fonte única dos planos — usada por `/pricing` (detalhado) e pela landing (preview). Acesso é
 * único (sem tier por feature): a única variação é o ciclo de cobrança, mensal ou anual, via
 * assinatura recorrente no Mercado Pago. Preços de referência — espelham
 * `subscription_price_monthly_cents`/`subscription_price_annual_cents` em
 * `backend/src/config/settings.py`; produto em pré-lançamento (ver FAQ de `/pricing`).
 */
export const PRICING_PLANS = [
  {
    name: "Mensal",
    price: "R$ 59",
    description: "Acesso completo à plataforma, cobrado todo mês.",
    features: ["Correção de redação por IA", "Trilhas de Português completas", "Treino gamificado nos 7 hubs", "Raio-X do escritor"],
    featured: false,
  },
  {
    name: "Anual",
    price: "R$ 588",
    description: "O mesmo acesso completo, equivalente a R$ 49/mês.",
    features: ["Tudo do plano Mensal", "~17% mais barato no total do ano"],
    featured: true,
  },
] as const;
