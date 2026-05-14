"use client";

import Link from "next/link";
import { ArrowRight, Map, PenLine, Target, Trophy } from "lucide-react";

import { MiniTrailPreview } from "@/components/app/exercise-game";
import { PageHeader, Surface } from "@/components/app/premium-ui";
import { Button } from "@/components/ui/button";

const steps = [
  { title: "Mapa", description: "Etapas douradas mostram a proxima missao liberada.", icon: Map },
  { title: "Combo", description: "Sequencias de acertos aceleram XP e missoes.", icon: Target },
  { title: "Escrita", description: "Redacao tambem entra na progressao semanal.", icon: PenLine },
  { title: "Recompensa", description: "Titulos e conquistas surgem por consistencia.", icon: Trophy },
];

export default function OnboardingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Boas-vindas"
        title="Sua temporada ENEM comecou"
        description="Complete etapas, desbloqueie fases e transforme exercicios em uma jornada diaria."
        action={
          <Button asChild size="lg" className="w-full md:w-auto">
            <Link href="/dashboard">
              Abrir dashboard
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <Surface key={step.title} delay={index * 0.04}>
              <div className="mb-5 inline-flex rounded-lg bg-secondary/18 p-3 text-secondary shadow-glow">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="text-xl font-black tracking-normal">{step.title}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
            </Surface>
          );
        })}
      </div>
      <Surface>
        <MiniTrailPreview progress={42} />
      </Surface>
      <Surface className="overflow-hidden bg-primary text-primary-foreground">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold text-white/70">Primeira missao</p>
            <h2 className="mt-1 text-2xl font-black tracking-normal">Concluir 3 etapas e ganhar combo inicial</h2>
          </div>
          <Button asChild variant="secondary">
            <Link href="/exercicios">
              Comecar
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </Surface>
    </div>
  );
}
