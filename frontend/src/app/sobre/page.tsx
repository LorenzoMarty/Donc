import Link from "next/link";
import { ArrowRight, Brain, GraduationCap, Sparkles } from "lucide-react";

import { AceternityGrid, HoverGlowCard, Reveal } from "@/components/sections/aceternity-primitives";
import { MarketingShell } from "@/components/sections/marketing-shell";
import { Button } from "@/components/ui/button";

export default function AboutPage() {
  return (
    <MarketingShell>
      <main className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <AceternityGrid className="rounded-[2rem] p-6 md:p-10">
          <Reveal className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Sobre</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-normal md:text-6xl">Donk ENEM existe para transformar estudo em sensacao real de progresso.</h1>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              A plataforma une design moderno, IA aplicada à redação e arquitetura de progressão para alunos que precisam de foco, clareza e rotina.
            </p>
            <Button asChild size="lg" className="mt-7">
              <Link href="/cadastro">
                Entrar na jornada
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </Reveal>
        </AceternityGrid>

        <section className="grid gap-4 py-12 md:grid-cols-3">
          {[
            { title: "Criatividade", text: "Amarelo como sistema visual para ideias, energia mental e insight.", icon: Sparkles },
            { title: "Inteligência", text: "Feedbacks explicativos, dados históricos e estudo personalizado.", icon: Brain },
            { title: "Foco ENEM", text: "Sem dispersão: Português, Redação e competências cobradas.", icon: GraduationCap },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <HoverGlowCard key={item.title} delay={index * 0.05}>
                <Icon className="mb-5 h-6 w-6 text-primary" aria-hidden="true" />
                <h2 className="text-xl font-semibold tracking-normal">{item.title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.text}</p>
              </HoverGlowCard>
            );
          })}
        </section>
      </main>
    </MarketingShell>
  );
}
