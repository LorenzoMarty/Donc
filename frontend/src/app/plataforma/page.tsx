import Link from "next/link";
import { ArrowRight, Brain, FilePenLine, GraduationCap, LineChart, Medal, PlayCircle } from "lucide-react";

import { AceternityGrid, HoverGlowCard, Reveal } from "@/components/sections/aceternity-primitives";
import { MarketingShell } from "@/components/sections/marketing-shell";
import { Button } from "@/components/ui/button";

const pillars = [
  { title: "Diagnóstico contínuo", text: "Painel com metas, notas por competência, sequência de dias e pontos fracos.", icon: LineChart },
  { title: "Prática guiada", text: "Trilhas com etapas curtas, revisão embutida e avanço só quando você domina o assunto.", icon: PlayCircle },
  { title: "Redação ativa", text: "Editor A4, IA por competência, repertório e laboratório de argumentação.", icon: FilePenLine },
  { title: "Domínio que fica registrado", text: "Marcos discretos pra constância e qualidade — nada de percentual solto sem contexto.", icon: Medal },
];

const showcase = [
  {
    title: "Aprender",
    text: "Aulas curtas em vídeo com material de apoio, organizadas por competência do ENEM — sem precisar garimpar conteúdo espalhado.",
  },
  {
    title: "Praticar",
    text: "13 formatos de exercício interativo cobrindo interpretação, gramática, conectivos e argumentação em sessões de 5-10 minutos.",
  },
  {
    title: "Escrever",
    text: "Editor de redação com correção por IA, banco de repertório e histórico de nota por competência ao longo do tempo.",
  },
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
              <h1 className="font-display max-w-3xl text-4xl font-semibold leading-tight tracking-normal md:text-5xl lg:text-6xl">
                Tudo que Português e Redação precisam, num fluxo só.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
                Donc organiza conteúdo, prática, correção por IA e histórico de evolução na mesma tela — sem alternar entre cinco apps
                diferentes pra estudar.
              </p>
              <Button asChild size="lg" className="mt-7">
                <Link href="/cadastro">
                  Criar conta grátis
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

        <section className="py-12">
          <Reveal className="mb-6 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Como funciona</p>
            <h2 className="font-display mt-2 text-3xl font-semibold tracking-normal md:text-4xl">Um fluxo, três movimentos.</h2>
          </Reveal>
          <div className="fluid-grid gap-4 [--grid-min:16rem]">
            {showcase.map((item, index) => (
              <HoverGlowCard key={item.title} delay={index * 0.05}>
                <Brain className="mb-5 h-6 w-6 text-primary" aria-hidden="true" />
                <h3 className="text-2xl font-semibold tracking-normal">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.text}</p>
              </HoverGlowCard>
            ))}
          </div>
        </section>

        <section className="pb-8">
          <div className="game-surface grid gap-6 bg-primary p-5 text-primary-foreground md:grid-cols-[1fr_auto] md:items-center md:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground/62">Quer ver por dentro?</p>
              <h2 className="font-display mt-2 text-3xl font-semibold leading-tight tracking-normal md:text-4xl">
                Crie a conta e explore a plataforma sem compromisso.
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
