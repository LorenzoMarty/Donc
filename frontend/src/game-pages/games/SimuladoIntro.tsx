"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

import { buildAdaptiveSimulado } from "@/features/gamification/adaptive";
import { getAllGames } from "@/features/gamification/catalog";
import { HUBS } from "@/features/gamification/symptoms";
import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game-store";

export default function SimuladoIntro() {
  const adaptive = useGameStore((state) => state.adaptive);
  const remoteGames = useGameStore((state) => state.remoteGames);
  const hydrateRemoteGames = useGameStore((state) => state.hydrateRemoteGames);

  useEffect(() => {
    hydrateRemoteGames();
  }, [hydrateRemoteGames]);

  const blocks = useMemo(() => buildAdaptiveSimulado(getAllGames(remoteGames), adaptive), [remoteGames, adaptive]);

  return (
    <div className="space-y-5">
      <Link
        href="/games"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Atividades
      </Link>

      <PageHeader
        eyebrow="Simulado inteligente"
        title="Sequência adaptativa cross-sintoma"
        description="Mistura micro-desafios de vários sintomas de uma vez, priorizando os pontos mais fracos do seu perfil."
      />

      <Surface>
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-primary/30 bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-normal">
              {blocks.length} bloco{blocks.length === 1 ? "" : "s"} · ~{blocks.length * 2} min
            </h2>
            <p className="text-sm text-muted-foreground">Um bloco por sintoma, encadeados sem interrupção.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {blocks.map((block) => (
            <Badge key={block.hub} variant="outline">
              {HUBS[block.hub].title}
            </Badge>
          ))}
        </div>

        <Button asChild className="mt-6 w-full sm:w-auto">
          <Link href="/games/simulado/sessao?step=0">
            Começar
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </Surface>
    </div>
  );
}
