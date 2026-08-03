"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, UserRound } from "lucide-react";

import type { ArtificialityRound, GameCategory, GameCompletion, GameDefinition } from "@/features/gamification/types";
import { EngineResult } from "@/games/_engines/EngineResult";
import { GRADE_LABEL, pointsToGrade } from "@/games/_engines/grade";
import { shuffle } from "@/games/_engines/shuffleOptions";
import { GameSessionShell } from "@/game-pages/games/components/GameSessionShell";
import { Surface } from "@/components/shared/premium-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game-store";
import { cn } from "@/utils";

/** Engine `artificiality`: detectar trecho autêntico × artificial e o defeito dominante. */
export function ArtificialitySession({ game, category }: { game: GameDefinition; category: GameCategory }) {
  const completeGame = useGameStore((state) => state.completeGame);
  const recordCognitiveOutcome = useGameStore((state) => state.recordCognitiveOutcome);
  const rounds = useMemo<ArtificialityRound[]>(() => shuffle(game.artificiality?.rounds ?? []), [game.artificiality]);

  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<"verdict" | "flaw" | "done">("verdict");
  const [verdictOk, setVerdictOk] = useState<boolean | null>(null);
  const [flawPick, setFlawPick] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<GameCompletion | null>(null);
  const [missed, setMissed] = useState<{ id: string; text: string }[]>([]);

  const round = rounds[step];
  const flawOptions = useMemo(() => (round?.flaw ? shuffle(round.flaw.options) : []), [round]);
  const grade = pointsToGrade((score / Math.max(rounds.length, 1)) * 4);

  if (!round && !result) {
    return (
      <Surface className="text-center">
        <h1 className="text-2xl font-semibold">Atividade sem trechos</h1>
        <Button asChild className="mt-4">
          <Link href={`/games/${category.slug}`}>Voltar à categoria</Link>
        </Button>
      </Surface>
    );
  }

  function chooseVerdict(value: "humano" | "artificial") {
    if (phase !== "verdict" || !round) return;
    const ok = value === round.verdict;
    setVerdictOk(ok);
    if (value === "artificial" && ok && round.flaw) {
      setPhase("flaw");
      return;
    }
    finish(ok);
  }

  function chooseFlaw(id: string) {
    if (phase !== "flaw" || !round?.flaw) return;
    const ok = round.flaw.options.find((o) => o.id === id)?.correct === true;
    setFlawPick(id);
    finish(ok);
  }

  function finish(correct: boolean) {
    if (!round) return;
    setPhase("done");
    if (correct) setScore((v) => v + 1);
    else setMissed((m) => [...m, { id: round.id, text: round.explanation }]);
    recordCognitiveOutcome(game, { tags: round.tags, correct });
  }

  function next() {
    if (step < rounds.length - 1) {
      setStep((v) => v + 1);
      setPhase("verdict");
      setVerdictOk(null);
      setFlawPick(null);
      return;
    }
    setResult(completeGame(game, score, rounds.length, 0));
  }

  function restart() {
    setStep(0);
    setPhase("verdict");
    setVerdictOk(null);
    setFlawPick(null);
    setScore(0);
    setMissed([]);
    setResult(null);
  }

  return (
    <GameSessionShell
      categoryName={category.name}
      categorySlug={category.slug}
      title={game.name}
      step={step + (phase === "done" ? 1 : 0)}
      total={rounds.length}
      xp={game.xpReward}
    >
      <div className="force-light">
      {round && (
        <div className="mx-auto flex min-h-[70dvh] max-w-2xl flex-col items-center justify-center text-center md:min-h-[75dvh]">
        <motion.div key={round.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full">
          <Badge className="mb-4 border-primary/20 bg-primary/10 text-primary">Trecho {step + 1}/{rounds.length}</Badge>
          <blockquote className="rounded-3xl bg-card px-8 py-6 text-left font-display text-xl leading-8 shadow-elevated md:px-12 md:py-10 md:text-2xl">
            {round.passage}
          </blockquote>

          {phase === "verdict" && (
            <>
              <p className="mt-6 text-sm font-medium text-muted-foreground">Este trecho soa autêntico ou artificial?</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => chooseVerdict("humano")}
                  className="flex min-h-16 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-6 py-5 text-base font-semibold shadow-soft transition-colors hover:border-primary/50 hover:bg-primary/5"
                >
                  <UserRound className="h-4 w-4" aria-hidden="true" /> Autêntico
                </button>
                <button
                  type="button"
                  onClick={() => chooseVerdict("artificial")}
                  className="flex min-h-16 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-6 py-5 text-base font-semibold shadow-soft transition-colors hover:border-primary/50 hover:bg-primary/5"
                >
                  <Bot className="h-4 w-4" aria-hidden="true" /> Artificial
                </button>
              </div>
            </>
          )}

          {phase === "flaw" && round.flaw && (
            <>
              <p className="mt-6 text-sm font-medium text-muted-foreground">Correto — é artificial. Qual o defeito dominante?</p>
              <div className="mt-3 grid gap-2">
                {flawOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => chooseFlaw(option.id)}
                    className="min-h-14 rounded-2xl border border-border bg-card px-5 py-3 text-left text-sm shadow-soft transition-colors hover:border-primary/50 hover:bg-primary/5"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}

          <AnimatePresence>
            {phase === "done" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "mt-5 rounded-2xl border p-4 text-left text-sm leading-6",
                  verdictOk && (flawPick === null || round.flaw?.options.find((o) => o.id === flawPick)?.correct)
                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-800"
                    : "border-destructive/25 bg-destructive/10 text-red-800",
                )}
              >
                <p className="flex items-center gap-2 font-semibold">
                  {round.verdict === "artificial" ? <Bot className="h-4 w-4" aria-hidden="true" /> : <UserRound className="h-4 w-4" aria-hidden="true" />}
                  {round.verdict === "artificial" ? "Artificial" : "Autêntico"}
                </p>
                <p className="mt-1 text-foreground/80">{round.explanation}</p>
                <Button onClick={next} className="mt-4">
                  {step < rounds.length - 1 ? "Próximo trecho" : "Finalizar"}
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
        subline={`Você distinguiu o autêntico do artificial em ${score} de ${rounds.length} trechos. Foco: leitura crítica de naturalidade.`}
        review={missed}
        onRestart={restart}
        categorySlug={category.slug}
      />
      </div>
    </GameSessionShell>
  );
}
