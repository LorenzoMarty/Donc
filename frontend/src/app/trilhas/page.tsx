import Link from "next/link";
import { ArrowRight, CheckCircle2, Lock, Play, Trophy } from "lucide-react";

import { HoverGlowCard, Reveal } from "@/components/sections/aceternity-primitives";
import { MarketingShell } from "@/components/sections/marketing-shell";
import { Button } from "@/components/ui/button";

const tracks = ["Interpretação Textual", "Gramática Aplicada", "Redação ENEM", "Figuras de Linguagem"];

export default function TracksPage() {
  return (
    <MarketingShell>
      <main className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <section className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <Reveal>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-primary">Trilhas</p>
            <h1 className="text-4xl font-semibold leading-tight tracking-normal md:text-5xl lg:text-6xl">
              Trilhas de Português com etapas desbloqueáveis.
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              Avance uma etapa por vez — cada módulo concluído abre o próximo e dá bônus de XP.
            </p>
            <Button asChild size="lg" className="mt-7">
              <Link href="/games">
                Abrir trilhas
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="relative rounded-[2rem] border bg-card p-4 shadow-sm xs:p-6">
              <div className="absolute bottom-10 left-10 top-10 w-1 rounded-full bg-border">
                <div className="h-2/3 rounded-full bg-primary shadow-sm" />
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
                      <p className="text-sm text-muted-foreground">
                        {state === "locked" ? "Bloqueada" : state === "available" ? "Liberada agora" : "Concluída"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        <section className="fluid-grid gap-4 py-12 [--grid-min:15rem]">
          {tracks.map((track, index) => (
            <HoverGlowCard key={track} delay={index * 0.05}>
              <Trophy className="mb-5 h-6 w-6 text-primary" aria-hidden="true" />
              <h2 className="text-xl font-semibold tracking-normal">{track}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Etapas curtas com revisão e prática aplicada ao final de cada módulo.
              </p>
            </HoverGlowCard>
          ))}
        </section>
      </main>
    </MarketingShell>
  );
}

function stateClass(state: string) {
  if (state === "completed")
    return "relative z-10 grid h-14 w-14 place-items-center rounded-lg border border-accent/40 bg-accent text-accent-foreground shadow-sm";
  if (state === "available")
    return "relative z-10 grid h-16 w-16 place-items-center rounded-lg border border-primary/55 bg-primary text-primary-foreground shadow-sm";
  return "relative z-10 grid h-12 w-12 place-items-center rounded-lg border bg-muted text-muted-foreground";
}
