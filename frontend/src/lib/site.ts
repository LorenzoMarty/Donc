import type { Metadata } from "next";

import { PRICING_PLANS } from "@/features/marketing/pricing-plans";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

// NEXT_PUBLIC_* é embutido no build: se faltar, sitemap, canonical e og:url saem apontando para localhost.
if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_SITE_URL && process.env.CI !== "true") {
  console.warn("[seo] NEXT_PUBLIC_SITE_URL não definido no build: sitemap, canonical e og:url usarão http://localhost:3000.");
}

export type MarketingPage = { path: string; title: string; description: string; priority: number };

/** Fonte única das páginas públicas: alimenta `sitemap.xml` e o `metadata` de cada página. */
export const MARKETING_PAGES: MarketingPage[] = [
  {
    path: "/",
    title: "Português e Redação ENEM com correção por IA",
    description: "Estude Português e Redação ENEM com correção por IA competência a competência, treinos curtos, rotina e progresso real.",
    priority: 1,
  },
  {
    path: "/pricing",
    title: "Planos e preços",
    description: `Plano ${PRICING_PLANS[0].name.toLowerCase()} de ${PRICING_PLANS[0].price} ou ${PRICING_PLANS[1].name.toLowerCase()} de ${PRICING_PLANS[1].price}. Acesso completo à plataforma, com correção de redação por IA e trilhas de Português.`,
    priority: 0.9,
  },
  {
    path: "/plataforma",
    title: "A plataforma",
    description: "Conheça o editor de redação com correção por IA, as trilhas de Português, os treinos gamificados e o Raio-X do escritor.",
    priority: 0.8,
  },
  {
    path: "/trilhas",
    title: "Trilhas de Português",
    description: "Trilhas de gramática, redação e figuras de linguagem com prática guiada, focadas no que mais cai no ENEM.",
    priority: 0.7,
  },
  {
    path: "/sobre",
    title: "Sobre o Donc",
    description: "Por que o Donc existe: estudar Português e Redação com feedback de verdade, sem decoreba e sem enrolação.",
    priority: 0.5,
  },
  {
    path: "/termos",
    title: "Termos de Uso",
    description: "Termos de Uso da plataforma Donc: regras de acesso, assinatura, uso adequado e responsabilidades de cada parte.",
    priority: 0.2,
  },
  {
    path: "/privacidade",
    title: "Política de Privacidade",
    description: "Como o Donc coleta, usa e protege os seus dados, e como exercer seus direitos pela LGPD.",
    priority: 0.2,
  },
  {
    path: "/cancelamento",
    title: "Cancelamento e Reembolso",
    description: "Como cancelar a assinatura do Donc e a política de reembolso.",
    priority: 0.2,
  },
];

/** `metadata` de uma página pública: title, description, canonical e Open Graph/Twitter. */
export function marketingMetadata(path: string): Metadata {
  const page = MARKETING_PAGES.find((item) => item.path === path);
  if (!page) throw new Error(`Página de marketing desconhecida: ${path}`);
  const url = `${SITE_URL}${path === "/" ? "" : path}`;
  // `openGraph`/`twitter` do segmento filho substituem os do pai por inteiro, então a imagem
  // (gerada em app/opengraph-image.tsx) precisa ser repetida aqui.
  const image = { url: "/opengraph-image", width: 1200, height: 630, alt: "Donc | Português e Redação ENEM" };
  return {
    title: path === "/" ? { absolute: `Donc | ${page.title}` } : page.title,
    description: page.description,
    alternates: { canonical: url },
    openGraph: { title: page.title, description: page.description, url, type: "website", siteName: "Donc", locale: "pt_BR", images: [image] },
    twitter: { card: "summary_large_image", title: page.title, description: page.description, images: [image.url] },
  };
}
