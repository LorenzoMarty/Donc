"use client";

import Link from "next/link";
import { ArrowRight, Map, PenLine, Target, Trophy } from "lucide-react";

import { MiniTrailPreview } from "@/components/game/exercise-game";
import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { Button } from "@/components/ui/button";

const steps = [
  { title: "Mapa", description: "Etapas amarelas mostram a próxima missão liberada.", icon: Map },
  { title: "Combo", description: "Sequências de acertos aceleram XP e missões.", icon: Target },
  { title: "Escrita", description: "Redação também entra na progressão semanal.", icon: PenLine },
  { title: "Recompensa", description: "Títulos e conquistas surgem por consistência.", icon: Trophy },
];

export default function OnboardingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Boas-vindas"
        title="Sua temporada ENEM começou"
        description="Complete etapas, desbloqueie fases e transforme exercícios em uma jornada diária."
        action={
          <Button asChild size="lg" className="w-full md:w-auto">
            <Link href="/dashboard">
              Abrir painel
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
              <div className="mb-5 inline-flex rounded-2xl border-2 border-foreground bg-secondary p-3 text-secondary-foreground shadow-[0_4px_0_hsl(var(--foreground))]">
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
            <p className="text-sm font-bold text-foreground/70">Primeira missão</p>
            <h2 className="mt-1 text-2xl font-black tracking-normal">Concluir 3 etapas e ganhar combo inicial</h2>
          </div>
          <Button asChild variant="secondary">
            <Link href="/exercicios">
              Começar
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </Surface>
    </div>
  );
}
