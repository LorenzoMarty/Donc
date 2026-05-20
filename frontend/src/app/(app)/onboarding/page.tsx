"use client";

import Link from "next/link";
import { ArrowRight, Map, PenLine, Target, Trophy } from "lucide-react";

import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const steps = [
  { title: "Mapa", description: "Etapas amarelas mostram a proxima pratica recomendada.", icon: Map },
  { title: "Ritmo", description: "Sequencias de acertos reforcam consistencia e revisao.", icon: Target },
  { title: "Escrita", description: "Redação também entra na progressão semanal.", icon: PenLine },
  { title: "Recompensa", description: "Títulos e conquistas surgem por consistência.", icon: Trophy },
];

export default function OnboardingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Boas-vindas"
        title="Sua rotina ENEM comecou"
        description="Complete etapas curtas e transforme exercicios em uma rotina diaria de escrita."
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
              <div className="mb-5 inline-flex rounded-md border border-primary/25 bg-primary/12 p-3 text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="text-xl font-semibold tracking-normal">{step.title}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
            </Surface>
          );
        })}
      </div>
      <Surface>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Primeira semana</p>
            <h2 className="mt-1 text-xl font-semibold tracking-normal">Configure uma rotina simples de pratica.</h2>
          </div>
          <div className="w-full md:max-w-sm">
            <div className="mb-2 flex justify-between text-xs font-semibold text-muted-foreground">
              <span>Progresso inicial</span>
              <span>42%</span>
            </div>
            <Progress value={42} />
          </div>
        </div>
      </Surface>
      <Surface className="overflow-hidden bg-primary text-primary-foreground">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground/70">Primeira pratica</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-normal">Concluir 3 etapas e iniciar sua consistencia</h2>
          </div>
          <Button asChild variant="secondary">
            <Link href="/games">
              Começar
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </Surface>
    </div>
  );
}
