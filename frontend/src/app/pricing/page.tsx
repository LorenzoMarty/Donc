import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { HoverGlowCard, Reveal } from "@/components/sections/aceternity-primitives";
import { MarketingShell } from "@/components/sections/marketing-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils";

const plans = [
  {
    name: "Início",
    price: "R$ 29",
    description: "Pra sair do zero e criar rotina de Português.",
    features: ["Trilhas básicas de Português", "Painel de progresso", "Marcos de constância"],
  },
  {
    name: "Avançado",
    price: "R$ 59",
    description: "Pra quem já treina e quer evoluir a redação.",
    features: ["Tudo do Início", "Correção de redação por IA", "Laboratório de redação (editor + repertório)", "Histórico de notas por competência"],
    featured: true,
  },
  {
    name: "Mentoria",
    price: "R$ 129",
    description: "Pra reta final, com acompanhamento próximo.",
    features: ["Tudo do Avançado", "Mentoria personalizada", "Plano de estudo semanal"],
  },
];

const faq = [
  {
    question: "A correção de redação é feita por professor ou por IA?",
    answer:
      "Por IA, competência a competência, seguindo os mesmos 5 critérios do ENEM. Você recebe nota estimada e explicação do porquê de cada ponto perdido.",
  },
  {
    question: "Preciso terminar um plano específico ou posso trocar depois?",
    answer: "Pode mudar de plano quando quiser — o histórico de prática e as notas continuam no seu perfil.",
  },
  {
    question: "Funciona no celular?",
    answer: "Sim. A plataforma é responsiva: você treina no computador, tablet ou celular, o que estiver à mão.",
  },
  {
    question: "Os valores acima são os valores finais?",
    answer: "Donc está em pré-lançamento — estes preços são de referência e podem mudar antes do lançamento oficial.",
  },
];

export default function PricingPage() {
  return (
    <MarketingShell>
      <main className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Planos</p>
          <h1 className="font-display mt-3 text-4xl font-semibold leading-tight tracking-normal md:text-5xl lg:text-6xl">
            Escolha o ritmo, não abra mão da correção certa.
          </h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            Todos os planos incluem rotina guiada de Português. A diferença é o quanto de redação com IA e acompanhamento você leva junto.
          </p>
        </Reveal>

        <section className="fluid-grid gap-4 py-12 [--grid-min:17rem]">
          {plans.map((plan, index) => (
            <HoverGlowCard key={plan.name} delay={index * 0.06} className={plan.featured ? "border-primary/50 bg-primary/10" : undefined}>
              {plan.featured ? (
                <span className="game-chip mb-4 inline-flex bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  Mais escolhido
                </span>
              ) : null}
              <h2 className="text-2xl font-semibold tracking-normal">{plan.name}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{plan.description}</p>
              <p className="font-display mt-6 text-5xl font-semibold tabular-nums tracking-normal">
                {plan.price}
                <span className="font-sans text-base font-medium text-muted-foreground">/mês</span>
              </p>
              <div className="mt-7 space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3 text-sm font-medium">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              <Button asChild className="mt-8 w-full" variant={plan.featured ? "default" : "outline"}>
                <Link href="/cadastro">
                  Escolher {plan.name}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </HoverGlowCard>
          ))}
        </section>

        <section className="mx-auto max-w-3xl py-8">
          <Reveal className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Perguntas frequentes</p>
            <h2 className="font-display mt-2 text-3xl font-semibold tracking-normal">Antes de escolher, tire as dúvidas.</h2>
          </Reveal>
          <div className="space-y-3">
            {faq.map((item, index) => (
              <Reveal key={item.question} delay={index * 0.04} className="game-tile bg-card p-5">
                <p className="font-semibold">{item.question}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.answer}</p>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="py-8">
          <div className={cn("game-surface grid gap-6 bg-primary p-5 text-primary-foreground md:grid-cols-[1fr_auto] md:items-center md:p-8")}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground/62">Sem cartão pra começar a treinar</p>
              <h2 className="font-display mt-2 text-3xl font-semibold leading-tight tracking-normal md:text-4xl">
                Crie a conta e veja qual plano faz sentido pra você.
              </h2>
            </div>
            <Button asChild size="lg" className="bg-background text-foreground hover:bg-background/90">
              <Link href="/cadastro">
                Criar conta grátis
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
