"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, PenLine, Target, Trophy } from "lucide-react";

import { PageHeader, Surface } from "@/components/app/premium-ui";
import { Button } from "@/components/ui/button";

const steps = [
  { title: "Rotina", description: "Metas curtas para manter o streak vivo.", icon: Target },
  { title: "Escrita", description: "Editor limpo para entrar em foco rapido.", icon: PenLine },
  { title: "Feedback", description: "Competencias e insights viram acao.", icon: CheckCircle2 },
  { title: "Recompensa", description: "XP, titulos e conquistas sem ruido.", icon: Trophy },
];

export default function OnboardingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Boas-vindas"
        title="Sua temporada ENEM comecou"
        description="Estude em ciclos pequenos, acompanhe cada ganho e volte todos os dias com clareza."
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
      <Surface className="overflow-hidden bg-primary text-primary-foreground">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold text-white/70">Primeira missao</p>
            <h2 className="mt-1 text-2xl font-black tracking-normal">Escrever uma redacao e ganhar +120 XP</h2>
          </div>
          <Button asChild variant="secondary">
            <Link href="/redacao">
              Comecar
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </Surface>
    </div>
  );
}

