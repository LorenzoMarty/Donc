"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Swords, X } from "lucide-react";

import type { DuelRound, GameCategory, GameCompletion, GameDefinition } from "@/features/gamification/types";
import { EngineResult } from "@/games/_engines/EngineResult";
import { SessionHUD } from "@/game-pages/games/components/SessionHUD";
import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game-store";
import { cn } from "@/utils";

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Engine `duel`: duas versões próximas; escolher a melhor e perceber a dimensão decisiva. */
export function DuelSession({ game, category }: { game: GameDefinition; category: GameCategory }) {
  const completeGame = useGameStore((state) => state.completeGame);
  const recordSkillOutcomes = useGameStore((state) => state.recordSkillOutcomes);
  const streak = useGameStore((state) => state.streak.current);
  const rounds = useMemo<DuelRound[]>(() => shuffle(game.duel?.rounds ?? []), [game.duel]);

  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<"a" | "b" | null>(null);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<GameCompletion | null>(null);
  const [missed, setMissed] = useState<{ id: string; text: string }[]>([]);

  const round = rounds[step];
  const liveAccuracy = step ? Math.round((score / step) * 100) : 100;

  if (!round && !result) {
    return (
      <Surface className="text-center">
        <h1 className="text-2xl font-semibold">Atividade sem duelos</h1>
        <Button asChild className="mt-4">
          <Link href={`/games/${category.slug}`}>Voltar à categoria</Link>
        </Button>
      </Surface>
    );
  }

  function choose(side: "a" | "b") {
    if (picked || !round) return;
    const correct = side === round.winner;
    setPicked(side);
    if (correct) setScore((v) => v + 1);
    else setMissed((m) => [...m, { id: round.id, text: `${round.context} — vencia "${round.winner.toUpperCase()}" por ${round.dimension}.` }]);
    if (round.tags?.length) recordSkillOutcomes(round.tags.map((tag) => ({ tag, correct })));
  }

  function next() {
    if (step < rounds.length - 1) {
      setStep((v) => v + 1);
      setPicked(null);
      return;
    }
    setResult(completeGame(game, score, rounds.length, 0));
  }

  function restart() {
    setStep(0);
    setPicked(null);
    setScore(0);
    setMissed([]);
    setResult(null);
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        eyebrow={category.name}
        title={game.name}
        description={game.description}
        action={
          <Button asChild variant="outline">
            <Link href={`/games/${category.slug}`}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Categoria
            </Link>
          </Button>
        }
      />

      <SessionHUD accuracy={liveAccuracy} step={Math.min(step + (picked ? 1 : 0), rounds.length)} total={rounds.length} seconds={0} streak={streak} xp={game.xpReward} />

      {round && (
        <motion.section
          key={round.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="game-surface bg-card p-4 md:p-6"
        >
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge className="border-primary/20 bg-primary/10 text-primary">
              <Swords className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Duelo {step + 1}/{rounds.length}
            </Badge>
            <Badge variant="outline">Critério oculto: decida e descubra</Badge>
          </div>
          <p className="text-sm leading-6 text-foreground/80">{round.context}</p>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {(["a", "b"] as const).map((side) => {
              const isWinner = picked && side === round.winner;
              const isWrongPick = picked === side && side !== round.winner;
              return (
                <button
                  key={side}
                  type="button"
                  onClick={() => choose(side)}
                  disabled={picked !== null}
                  className={cn(
                    "game-tile bg-background/64 p-4 text-left text-sm leading-6 transition-colors",
                    picked === null && "hover:border-primary/50 hover:bg-primary/5",
                    isWinner && "border-emerald-500/55 bg-emerald-500/10",
                    isWrongPick && "border-destructive/55 bg-destructive/10",
                  )}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Versão {side.toUpperCase()}</span>
                    {isWinner ? <Check className="h-4 w-4 text-emerald-700" aria-hidden="true" /> : isWrongPick ? <X className="h-4 w-4 text-red-700" aria-hidden="true" /> : null}
                  </div>
                  {side === "a" ? round.a : round.b}
                </button>
              );
            })}
          </div>

          <AnimatePresence>
            {picked && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5 rounded-md border border-primary/20 bg-primary/5 p-4 text-sm leading-6"
              >
                <p className="font-semibold text-foreground">
                  Melhor: versão {round.winner.toUpperCase()} · dimensão decisiva: {round.dimension}
                </p>
                <p className="mt-1 text-muted-foreground">{round.explanation}</p>
                <Button onClick={next} className="mt-4">
                  {step < rounds.length - 1 ? "Próximo duelo" : "Finalizar"}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      )}

      <EngineResult
        result={result}
        headline={`${result?.attempt.accuracy ?? 0}% de acerto`}
        subline={`Você venceu ${score} de ${rounds.length} duelos.`}
        review={missed}
        onRestart={restart}
        categorySlug={category.slug}
      />
    </div>
  );
}
