"use client";

import Link from "next/link";
import { useEffect } from "react";

import { getCategoryBySlug, getGameById } from "@/features/gamification/catalog";
import { EssayAssemblySession } from "@/games/structure/EssayAssemblySession";
import { QuizSession } from "@/games/_engines/QuizSession";
import { TimedRushSession } from "@/games/_engines/TimedRushSession";
import { ClassifyDragSession } from "@/games/_engines/ClassifyDragSession";
import { OrderSession } from "@/games/_engines/OrderSession";
import { FillBlankSession } from "@/games/_engines/FillBlankSession";
import { DuelSession } from "@/games/_engines/DuelSession";
import { ArgumentEscalationSession } from "@/games/_engines/ArgumentEscalationSession";
import { ArtificialitySession } from "@/games/_engines/ArtificialitySession";
import { CorrectorSession } from "@/games/_engines/CorrectorSession";
import { EssayCollapseSession } from "@/games/_engines/EssayCollapseSession";
import { SurvivalSession } from "@/games/_engines/SurvivalSession";
import { TextSurgerySession } from "@/games/_engines/TextSurgerySession";
import { Surface } from "@/components/shared/premium-ui";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game-store";

/** Roteador puro: resolve `game`/`category` e despacha para o componente do engine correspondente. */
export default function GameSession({ categorySlug, gameId }: { categorySlug: string; gameId: string }) {
  const remoteGames = useGameStore((state) => state.remoteGames);
  const remoteGamesHydrated = useGameStore((state) => state.remoteGamesHydrated);
  const hydrateRemoteGames = useGameStore((state) => state.hydrateRemoteGames);

  const game = getGameById(gameId, remoteGames);
  const category = getCategoryBySlug(categorySlug);

  useEffect(() => {
    hydrateRemoteGames();
  }, [hydrateRemoteGames]);

  // Jogo dinamico (ai-*) pode nao ter carregado ainda.
  if (!game && !remoteGamesHydrated) {
    return (
      <Surface className="text-center">
        <h1 className="text-2xl font-semibold">Carregando jogo...</h1>
      </Surface>
    );
  }

  if (!game || !category || game.category !== category.id) {
    return (
      <Surface className="text-center">
        <h1 className="text-2xl font-semibold">Jogo nao encontrado</h1>
        <Button asChild className="mt-4">
          <Link href="/games">Voltar ao hub</Link>
        </Button>
      </Surface>
    );
  }

  // Roteamento por engine: cada engine interativo tem seu próprio componente.
  if (game.engine === "timed-rush") {
    return <TimedRushSession game={game} category={category} />;
  }
  if (game.engine === "classify") {
    return <ClassifyDragSession game={game} category={category} />;
  }
  if (game.engine === "order") {
    return <OrderSession game={game} category={category} />;
  }
  if (game.engine === "fill-blank") {
    return <FillBlankSession game={game} category={category} />;
  }
  if (game.engine === "sequence") {
    return <EssayAssemblySession game={game} category={category} />;
  }
  if (game.engine === "duel") {
    return <DuelSession game={game} category={category} />;
  }
  if (game.engine === "argument-escalation") {
    return <ArgumentEscalationSession game={game} category={category} />;
  }
  if (game.engine === "artificiality") {
    return <ArtificialitySession game={game} category={category} />;
  }
  if (game.engine === "corrector") {
    return <CorrectorSession game={game} category={category} />;
  }
  if (game.engine === "essay-collapse") {
    return <EssayCollapseSession game={game} category={category} />;
  }
  if (game.engine === "survival") {
    return <SurvivalSession game={game} category={category} />;
  }
  if (game.engine === "text-surgery") {
    return <TextSurgerySession game={game} category={category} />;
  }
  // engine "quiz" e "choice" caem no fallback.
  return <QuizSession game={game} category={category} />;
}
