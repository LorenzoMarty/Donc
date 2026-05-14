import Link from "next/link";
import { ArrowRight, Brain, FilePenLine, GraduationCap, LineChart, Medal, PlayCircle } from "lucide-react";

import { AceternityGrid, HoverGlowCard, Reveal } from "@/components/sections/aceternity-primitives";
import { MarketingShell } from "@/components/sections/marketing-shell";
import { Button } from "@/components/ui/button";

const pillars = [
  { title: "Diagnóstico contínuo", text: "Painel com metas, notas, sequência e habilidades fracas.", icon: LineChart },
  { title: "Prática guiada", text: "Trilhas, fases e desafios com desbloqueio gradual.", icon: PlayCircle },
  { title: "Redação ativa", text: "Editor, IA, repertório, conectivos e laboratório de argumentos.", icon: FilePenLine },
  { title: "Coleção de domínio", text: "Conquistas por raridade e platina da plataforma.", icon: Medal },
];

export default function PlatformPage() {
  return (
    <MarketingShell>
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <AceternityGrid className="rounded-[2rem] p-6 md:p-10">
          <div className="grid gap-10 md:grid-cols-[0.95fr_1.05fr] md:items-center">
            <Reveal>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/16 px-3 py-1 text-xs font-black uppercase text-foreground/70">
                <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
                Plataforma
              </div>
              <h1 className="max-w-3xl text-4xl font-black tracking-normal md:text-6xl">Uma plataforma de estudo com ritmo de jogo moderno.</h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
                Donk ENEM organiza Português e Redação em uma experiência aberta, visual e progressiva: conteúdo, prática, IA e conquistas no mesmo fluxo.
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
                    <div key={pillar.title} className="flex gap-4 rounded-lg border bg-card/80 p-4 shadow-sm">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="font-black">{pillar.title}</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{pillar.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Reveal>
          </div>
        </AceternityGrid>

        <section className="grid gap-4 py-12 md:grid-cols-3">
          {["Aprender", "Praticar", "Evoluir"].map((item, index) => (
            <HoverGlowCard key={item} delay={index * 0.05}>
              <Brain className="mb-5 h-6 w-6 text-primary" aria-hidden="true" />
              <h2 className="text-2xl font-black tracking-normal">{item}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Cada módulo leva o aluno para uma próxima ação clara, curta e mensurável.</p>
            </HoverGlowCard>
          ))}
        </section>
      </main>
    </MarketingShell>
  );
}
