"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Swords, X } from "lucide-react";

import type { DuelRound, GameCategory, GameCompletion, GameDefinition } from "@/features/gamification/types";
import { EngineResult } from "@/games/_engines/EngineResult";
import { GRADE_LABEL, pointsToGrade } from "@/games/_engines/grade";
import { shuffle } from "@/games/_engines/shuffleOptions";
import { shuffleDuelSide } from "@/games/_engines/shuffleDuelSide";
import { GameSessionShell } from "@/game-pages/games/components/GameSessionShell";
import { Surface } from "@/components/shared/premium-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game-store";
import { cn } from "@/utils";

/** Engine `duel`: duas versões próximas; escolher a melhor e perceber a dimensão decisiva. */
export function DuelSession({ game, category }: { game: GameDefinition; category: GameCategory }) {
  const completeGame = useGameStore((state) => state.completeGame);
  const recordCognitiveOutcome = useGameStore((state) => state.recordCognitiveOutcome);
  const [attempt, setAttempt] = useState(0);
  // `attempt` força reordenar/reembaralhar lado a/b a cada "Repetir" — sem isso o useMemo
  // reaproveitava a mesma ordem/lado da 1ª tentativa em replays no mesmo componente montado.
  const rounds = useMemo<DuelRound[]>(
    () => shuffle(game.duel?.rounds ?? []).map(shuffleDuelSide),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game.duel, attempt],
  );

  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<"a" | "b" | null>(null);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<GameCompletion | null>(null);
  const [missed, setMissed] = useState<{ id: string; text: string }[]>([]);

  const round = rounds[step];
  const grade = pointsToGrade((score / Math.max(rounds.length, 1)) * 4);

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
    recordCognitiveOutcome(game, { tags: round.tags, correct });
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
    setAttempt((value) => value + 1);
  }

  return (
    <GameSessionShell
      categoryName={category.name}
      categorySlug={category.slug}
      title={game.name}
      step={step + (picked ? 1 : 0)}
      total={rounds.length}
    >
      <div className="force-light">
      {round && (
        <div className="mx-auto max-w-2xl">
        <motion.div
          key={round.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full text-center"
        >
          <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
            <Badge className="border-primary/20 bg-primary/10 text-primary">
              <Swords className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Duelo {step + 1}/{rounds.length}
            </Badge>
            <Badge variant="outline">Critério oculto: decida e descubra</Badge>
          </div>
          <div className="rounded-3xl bg-card px-8 py-6 shadow-elevated md:px-12 md:py-10">
            <p className="font-display text-xl leading-snug tracking-normal md:text-2xl">{round.context}</p>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2">
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
                    "rounded-2xl border border-border bg-card p-5 text-left text-sm leading-6 shadow-soft transition-colors",
                    picked === null && "hover:border-primary/50 hover:bg-primary/5",
                    isWinner && "border-emerald-500/55 bg-emerald-500/10",
                    isWrongPick && "border-warning/55 bg-warning/10",
                  )}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Versão {side.toUpperCase()}</span>
                    {isWinner ? <Check className="h-4 w-4 text-emerald-700" aria-hidden="true" /> : isWrongPick ? <X className="h-4 w-4 text-warning" aria-hidden="true" /> : null}
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
                className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-left text-sm leading-6"
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
        </motion.div>
        </div>
      )}

      <EngineResult
        result={result}
        grade={grade}
        headline={GRADE_LABEL[grade]}
        subline={`Você percebeu a versão de maior qualidade em ${score} de ${rounds.length} duelos. Foco: naturalidade e profundidade, não acerto bruto.`}
        review={missed}
        onRestart={restart}
        categorySlug={category.slug}
      />
      </div>
    </GameSessionShell>
  );
}
