"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { CheckCircle2 } from "lucide-react";

import { selectGamesForHub } from "@/features/gamification/adaptive";
import { getAllGames } from "@/features/gamification/catalog";
import { getSymptomHub } from "@/features/gamification/symptoms";
import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game-store";
import { useStepParam } from "@/utils";

/**
 * Sessão de treino contínua: encadeia os jogos do plano adaptativo sem voltar para a tela do
 * hub entre um jogo e outro. Não renderiza os engines diretamente — cada jogo continua sendo a
 * página `GameSession` já existente (com todo o seu HUD/resultado próprio); esta tela só
 * redireciona para o próximo passo via `returnTo`, evitando reescrever os 12 componentes de
 * engine para expor um callback de conclusão.
 */
export default function ChainedSession({ symptomId }: { symptomId: string }) {
  const hub = getSymptomHub(symptomId);
  const step = useStepParam();
  const router = useRouter();

  const adaptive = useGameStore((state) => state.adaptive);
  const remoteGames = useGameStore((state) => state.remoteGames);
  const hydrateRemoteGames = useGameStore((state) => state.hydrateRemoteGames);

  useEffect(() => {
    hydrateRemoteGames();
  }, [hydrateRemoteGames]);

  const plan = useMemo(
    () => (hub ? selectGamesForHub(hub.id, getAllGames(remoteGames), adaptive, 4) : []),
    [hub, remoteGames, adaptive],
  );

  const current = plan[step];

  useEffect(() => {
    if (!hub || !current) return;
    const nextStepUrl = `/games/treino/${hub.id}/sessao?step=${step + 1}`;
    const target = `/games/${current.category}/${current.id}?returnTo=${encodeURIComponent(nextStepUrl)}`;
    router.replace(target);
  }, [hub, current, step, router]);

  if (!hub) {
    return (
      <Surface className="text-center">
        <h1 className="text-2xl font-semibold">Sintoma não encontrado</h1>
        <Button asChild className="mt-4">
          <Link href="/games">Voltar ao hub</Link>
        </Button>
      </Surface>
    );
  }

  if (!current) {
    return (
      <div className="space-y-4">
        <PageHeader eyebrow="Treino por sintoma" title={hub.title} description="Sessão concluída" />
        <Surface className="text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-md border border-primary/30 bg-primary text-primary-foreground">
            <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold tracking-normal">Sessão concluída!</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {plan.length > 0
              ? `Você encadeou ${plan.length} micro-desafios sem sair do fluxo. Volte amanhã para uma nova sequência.`
              : "Sem plano adaptativo disponível agora."}
          </p>
          <Button asChild className="mt-6">
            <Link href={`/games/treino/${hub.id}`}>Voltar ao sintoma</Link>
          </Button>
        </Surface>
      </div>
    );
  }

  return (
    <Surface className="text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
        Missão {step + 1}/{plan.length}
      </p>
      <h1 className="mt-2 text-xl font-semibold tracking-normal">Preparando {current.name}...</h1>
    </Surface>
  );
}
