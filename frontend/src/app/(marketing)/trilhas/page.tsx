import Link from "next/link";
import { ArrowRight, CheckCircle2, Lock, Play, Trophy } from "lucide-react";

import { HoverGlowCard, Reveal } from "@/components/sections/aceternity-primitives";
import { MarketingShell } from "@/components/sections/marketing-shell";
import { Button } from "@/components/ui/button";

const tracks = [
  { title: "Interpretação Textual", text: "Leitura crítica, inferência e reconhecimento de estruturas argumentativas." },
  { title: "Gramática Aplicada", text: "Regras que aparecem de fato na prova, sem decoreba de exceção rara." },
  { title: "Redação ENEM", text: "Tese, desenvolvimento e proposta de intervenção com prática guiada." },
  { title: "Figuras de Linguagem", text: "Reconhecimento rápido, o suficiente pra não travar na hora da prova." },
];

export default function TracksPage() {
  return (
    <MarketingShell>
      <main className="marketing-container py-10">
        <section className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <Reveal>
            <p className="marketing-kicker mb-4">Trilhas</p>
            <h1 className="font-display text-4xl font-semibold leading-tight tracking-normal md:text-5xl lg:text-6xl">
              Uma etapa por vez, sem pular conteúdo.
            </h1>
            <p className="marketing-copy mt-5 text-lg">
              Cada trilha de Português avança em sequência: você só destrava a próxima etapa depois de mostrar domínio na atual — sem
              lacuna escondida no meio do caminho.
            </p>
            <Button asChild size="lg" className="mt-7">
              <Link href="/games">
                Abrir trilhas
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="marketing-surface relative rounded-[22px] p-5 xs:p-6 md:p-8">
              <div className="absolute bottom-10 left-10 top-10 w-1 rounded-full bg-border">
                <div className="h-2/3 rounded-full bg-primary shadow-soft" />
              </div>
              <div className="space-y-6 pl-14">
                {["completed", "completed", "available", "locked", "locked"].map((state, index) => (
                  <div key={`${state}-${index}`} className="flex items-center gap-4">
                    <div className={stateClass(state)}>
                      {state === "completed" ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : state === "available" ? (
                        <Play className="h-5 w-5" />
                      ) : (
                        <Lock className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">Etapa {index + 1}</p>
                      <p className="text-sm font-medium text-[hsl(var(--neutral-600))]">
                        {state === "locked" ? "Bloqueada até você concluir a anterior" : state === "available" ? "Liberada agora" : "Concluída"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        <section className="fluid-grid marketing-section gap-4 [--grid-min:15rem]">
          {tracks.map((track, index) => (
            <HoverGlowCard key={track.title} delay={index * 0.05}>
              <Trophy className="mb-5 h-6 w-6 text-primary" aria-hidden="true" />
              <h2 className="text-xl font-semibold tracking-normal">{track.title}</h2>
              <p className="marketing-copy mt-3 text-sm">{track.text}</p>
            </HoverGlowCard>
          ))}
        </section>

        <section className="pb-8">
          <div className="marketing-cta grid gap-6 rounded-[22px] p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/74">Primeira etapa liberada na hora</p>
              <h2 className="font-display mt-2 text-3xl font-semibold leading-tight tracking-normal md:text-4xl">
                Crie a conta e comece sua primeira trilha agora.
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

function stateClass(state: string) {
  if (state === "completed")
    return "relative z-10 grid h-14 w-14 place-items-center rounded-control bg-accent text-accent-foreground shadow-soft";
  if (state === "available")
    return "relative z-10 grid h-16 w-16 place-items-center rounded-control bg-primary text-primary-foreground shadow-control";
  return "relative z-10 grid h-12 w-12 place-items-center rounded-control bg-muted text-muted-foreground";
}
