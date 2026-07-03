"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { CheckCircle2 } from "lucide-react";

import { buildAdaptiveSimulado } from "@/features/gamification/adaptive";
import { getAllGames } from "@/features/gamification/catalog";
import { HUBS } from "@/features/gamification/symptoms";
import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game-store";

function useStepParam(): number {
  if (typeof window === "undefined") return 0;
  const raw = Number(new URLSearchParams(window.location.search).get("step") ?? "0");
  return Number.isFinite(raw) && raw >= 0 ? raw : 0;
}

/**
 * Simulado adaptativo cross-sintoma: mesma mecânica de redirecionamento encadeado do
 * `ChainedSession` (cada jogo continua sendo a página `GameSession` já existente), mas o plano
 * vem de `buildAdaptiveSimulado` (mistura hubs ponderada pelas fraquezas do aluno) em vez de um
 * único hub.
 */
export default function SimuladoSession() {
  const step = useStepParam();
  const router = useRouter();

  const adaptive = useGameStore((state) => state.adaptive);
  const remoteGames = useGameStore((state) => state.remoteGames);
  const hydrateRemoteGames = useGameStore((state) => state.hydrateRemoteGames);

  useEffect(() => {
    hydrateRemoteGames();
  }, [hydrateRemoteGames]);

  const blocks = useMemo(
    () => buildAdaptiveSimulado(getAllGames(remoteGames), adaptive),
    [remoteGames, adaptive],
  );

  const currentBlock = blocks[step];

  useEffect(() => {
    if (!currentBlock) return;
    const nextStepUrl = `/games/simulado/sessao?step=${step + 1}`;
    const target = `/games/${currentBlock.game.category}/${currentBlock.game.id}?returnTo=${encodeURIComponent(nextStepUrl)}`;
    router.replace(target);
  }, [currentBlock, step, router]);

  if (!currentBlock) {
    return (
      <div className="space-y-4">
        <PageHeader eyebrow="Simulado inteligente" title="Sequência adaptativa" description="Simulado concluído" />
        <Surface className="text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-md border border-primary/30 bg-primary text-primary-foreground">
            <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold tracking-normal">Simulado concluído!</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {blocks.length > 0
              ? `Você passou por ${blocks.length} sintomas diferentes nesta sequência.`
              : "Sem simulado disponível agora."}
          </p>
          <Button asChild className="mt-6">
            <Link href="/games">Voltar ao hub</Link>
          </Button>
        </Surface>
      </div>
    );
  }

  return (
    <Surface className="text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
        Bloco {step + 1}/{blocks.length}
      </p>
      <Badge variant="outline" className="mt-2">
        {HUBS[currentBlock.hub].title}
      </Badge>
      <h1 className="mt-2 text-xl font-semibold tracking-normal">Preparando {currentBlock.game.name}...</h1>
    </Surface>
  );
}
