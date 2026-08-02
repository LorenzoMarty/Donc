import Link from "next/link";
import { ArrowRight, Brain, FilePenLine, GraduationCap, LineChart, Medal, PlayCircle } from "lucide-react";

import { AceternityGrid, HoverGlowCard, Reveal } from "@/components/sections/aceternity-primitives";
import { MarketingShell } from "@/components/sections/marketing-shell";
import { Button } from "@/components/ui/button";

const pillars = [
  { title: "Diagnóstico contínuo", text: "Painel com metas, notas, sequência e habilidades fracas.", icon: LineChart },
  { title: "Prática guiada", text: "Trilhas, etapas curtas e revisões com progresso gradual.", icon: PlayCircle },
  { title: "Redação ativa", text: "Editor, IA, repertório, conectivos e laboratório de argumentos.", icon: FilePenLine },
  { title: "Domínio gradual", text: "Marcos discretos para registrar constância e melhoria real.", icon: Medal },
];

export default function PlatformPage() {
  return (
    <MarketingShell>
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <AceternityGrid className="rounded-[2rem] p-4 xs:p-6 md:p-10">
          <div className="grid gap-10 md:grid-cols-[0.95fr_1.05fr] md:items-center">
            <Reveal>
              <div className="game-chip mb-4 inline-flex items-center gap-2 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
                Plataforma
              </div>
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-normal md:text-5xl lg:text-6xl">
                Uma plataforma de estudo clara, moderna e constante.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
                Donc ENEM organiza Português e Redação em uma experiência visual e progressiva: conteúdo, prática, IA e histórico de
                evolução no mesmo fluxo.
              </p>
              <Button asChild size="lg" className="mt-7">
                <Link href="/cadastro">
                  Criar conta
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="grid gap-3">
                {pillars.map((pillar) => {
                  const Icon = pillar.icon;
                  return (
                    <div key={pillar.title} className="game-tile flex gap-4 bg-card/80 p-4">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-control bg-primary/12 text-primary">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="font-semibold">{pillar.title}</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{pillar.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Reveal>
          </div>
        </AceternityGrid>

        <section className="fluid-grid gap-4 py-12 [--grid-min:16rem]">
          {["Aprender", "Praticar", "Evoluir"].map((item, index) => (
            <HoverGlowCard key={item} delay={index * 0.05}>
              <Brain className="mb-5 h-6 w-6 text-primary" aria-hidden="true" />
              <h2 className="text-2xl font-semibold tracking-normal">{item}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Cada módulo leva o aluno para uma próxima ação clara, curta e mensurável.
              </p>
            </HoverGlowCard>
          ))}
        </section>
      </main>
    </MarketingShell>
  );
}
