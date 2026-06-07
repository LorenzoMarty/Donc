"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Bot, UserRound } from "lucide-react";

import type { ArtificialityRound, GameCategory, GameCompletion, GameDefinition } from "@/features/gamification/types";
import { EngineResult } from "@/games/_engines/EngineResult";
import { GRADE_LABEL, pointsToGrade } from "@/games/_engines/grade";
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

/** Engine `artificiality`: detectar trecho autêntico × artificial e o defeito dominante. */
export function ArtificialitySession({ game, category }: { game: GameDefinition; category: GameCategory }) {
  const completeGame = useGameStore((state) => state.completeGame);
  const recordCognitiveOutcome = useGameStore((state) => state.recordCognitiveOutcome);
  const streak = useGameStore((state) => state.streak.current);
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
  const liveAccuracy = step ? Math.round((score / step) * 100) : 100;

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

      <SessionHUD accuracy={liveAccuracy} step={Math.min(step + (phase === "done" ? 1 : 0), rounds.length)} total={rounds.length} seconds={0} streak={streak} xp={game.xpReward} />

      {round && (
        <motion.section key={round.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="game-surface bg-card p-4 md:p-6">
          <Badge className="mb-3 border-primary/20 bg-primary/10 text-primary">Trecho {step + 1}/{rounds.length}</Badge>
          <blockquote className="rounded-md border border-border bg-background/64 p-4 text-base leading-7">{round.passage}</blockquote>

          {phase === "verdict" && (
            <>
              <p className="mt-5 text-sm font-medium text-muted-foreground">Este trecho soa autêntico ou artificial?</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Button variant="outline" className="h-auto py-3" onClick={() => chooseVerdict("humano")}>
                  <UserRound className="h-4 w-4" aria-hidden="true" /> Autêntico
                </Button>
                <Button variant="outline" className="h-auto py-3" onClick={() => chooseVerdict("artificial")}>
                  <Bot className="h-4 w-4" aria-hidden="true" /> Artificial
                </Button>
              </div>
            </>
          )}

          {phase === "flaw" && round.flaw && (
            <>
              <p className="mt-5 text-sm font-medium text-muted-foreground">Correto — é artificial. Qual o defeito dominante?</p>
              <div className="mt-3 grid gap-2">
                {flawOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => chooseFlaw(option.id)}
                    className="game-tile bg-background/64 p-3 text-left text-sm transition-colors hover:border-primary/50 hover:bg-primary/5"
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
                  "mt-5 rounded-md border p-4 text-sm leading-6",
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
        </motion.section>
      )}

      <EngineResult
        result={result}
        grade={pointsToGrade((score / Math.max(rounds.length, 1)) * 4)}
        headline={GRADE_LABEL[pointsToGrade((score / Math.max(rounds.length, 1)) * 4)]}
        subline={`Você distinguiu o autêntico do artificial em ${score} de ${rounds.length} trechos. Foco: leitura crítica de naturalidade.`}
        review={missed}
        onRestart={restart}
        categorySlug={category.slug}
      />
    </div>
  );
}
