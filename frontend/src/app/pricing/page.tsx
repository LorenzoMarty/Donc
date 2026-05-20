import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { HoverGlowCard, Reveal } from "@/components/sections/aceternity-primitives";
import { MarketingShell } from "@/components/sections/marketing-shell";
import { Button } from "@/components/ui/button";

const plans = [
  { name: "Início", price: "R$ 29", description: "Para iniciar rotina de Português.", features: ["Trilhas básicas", "Painel", "Conquistas comuns"] },
  { name: "Avançado", price: "R$ 59", description: "Para evoluir redação com IA.", features: ["Correção IA", "Laboratório de redação", "Histórico e dados"], featured: true },
  { name: "Mentoria", price: "R$ 129", description: "Para preparação intensiva.", features: ["Tudo do Avançado", "Simulados guiados", "Planos semanais"] },
];

export default function PricingPage() {
  return (
    <MarketingShell>
      <main className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Planos</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-normal md:text-6xl">Planos simples para uma rotina seria.</h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">Estrutura moderna, gamificação elegante e IA aplicada à redação.</p>
        </Reveal>

        <section className="grid gap-4 py-12 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <HoverGlowCard key={plan.name} delay={index * 0.06} className={plan.featured ? "border-primary/50 bg-primary/10" : undefined}>
              <h2 className="text-2xl font-semibold tracking-normal">{plan.name}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{plan.description}</p>
              <p className="mt-6 text-5xl font-semibold tracking-normal">
                {plan.price}
                <span className="text-base font-medium text-muted-foreground">/mes</span>
              </p>
              <div className="mt-7 space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3 text-sm font-medium">
                    <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                    {feature}
                  </div>
                ))}
              </div>
              <Button asChild className="mt-8 w-full" variant={plan.featured ? "default" : "outline"}>
                <Link href="/cadastro">
                  Escolher plano
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </HoverGlowCard>
          ))}
        </section>
      </main>
    </MarketingShell>
  );
}
