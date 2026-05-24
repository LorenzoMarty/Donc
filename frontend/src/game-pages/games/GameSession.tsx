"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, RotateCcw, XCircle } from "lucide-react";

import { getCategoryBySlug, getGameById } from "@/features/gamification/catalog";
import { getBadgesById } from "@/features/achievements/achievements";
import { ConnectivePrecisionSession } from "@/games/connectives/ConnectivePrecisionSession";
import { EssayAssemblySession } from "@/games/structure/EssayAssemblySession";
import { SessionHUD } from "@/game-pages/games/components/SessionHUD";
import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game-store";
import { cn } from "@/utils";

export default function GameSession({ categorySlug, gameId }: { categorySlug: string; gameId: string }) {
  const game = getGameById(gameId);
  const category = getCategoryBySlug(categorySlug);
  const completeGame = useGameStore((state) => state.completeGame);
  const streak = useGameStore((state) => state.streak.current);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [result, setResult] = useState<ReturnType<typeof completeGame> | null>(null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (result) return;
    const id = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [result]);

  const question = game?.questions[step];
  const score = answers.filter(Boolean).length;
  const liveAccuracy = answers.length ? Math.round((score / answers.length) * 100) : 100;
  const unlockedBadges = useMemo(() => getBadgesById(result?.unlockedBadges ?? []), [result]);

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

  if (game.id === "connectives-precision") {
    return <ConnectivePrecisionSession game={game} category={category} />;
  }

  if (game.id === "essay-assembly") {
    return <EssayAssemblySession game={game} category={category} />;
  }

  function answer(index: number) {
    if (!question || selected !== null || result || !game) return;
    const isCorrect = index === question.answerIndex;
    setSelected(index);
    const nextAnswers = [...answers, isCorrect];
    window.setTimeout(() => {
      if (step < game.questions.length - 1) {
        setAnswers(nextAnswers);
        setStep((value) => value + 1);
        setSelected(null);
        return;
      }
      setAnswers(nextAnswers);
      setResult(completeGame(game, nextAnswers.filter(Boolean).length, game.questions.length, seconds));
    }, 620);
  }

  function restart() {
    setStep(0);
    setSelected(null);
    setAnswers([]);
    setResult(null);
    setSeconds(0);
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

      <SessionHUD
        accuracy={liveAccuracy}
        step={Math.min(step + 1, game.questions.length)}
        total={game.questions.length}
        seconds={seconds}
        streak={streak}
        xp={game.xpReward}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,330px)]">
        <main>
          <AnimatePresence mode="wait">
            {!result && question ? (
              <motion.section
                key={question.id}
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.98 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
                className="game-surface bg-card p-4 md:p-6"
              >
                <div className="mb-5 flex flex-wrap gap-2">
                  <Badge variant="secondary">{game.difficulty}</Badge>
                  <Badge variant="outline">{game.estimatedTime}</Badge>
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Questao {step + 1} de {game.questions.length}
                </p>
                <h2 className="mt-3 text-2xl font-semibold leading-tight tracking-normal md:text-3xl">
                  {question.prompt}
                </h2>

                <div className="mt-6 grid gap-3 lg:grid-cols-2">
                  {question.options.map((option, index) => {
                    const isSelected = selected === index;
                    const isCorrect = selected !== null && index === question.answerIndex;
                    const isWrong = isSelected && !isCorrect;
                    return (
                      <motion.button
                        key={option}
                        type="button"
                        onClick={() => answer(index)}
                        whileHover={selected === null ? { y: -3, scale: 1.01 } : undefined}
                        whileTap={selected === null ? { scale: 0.98 } : undefined}
                        className={cn(
                          "game-tile min-h-24 bg-background/64 p-4 text-left transition-colors",
                          isCorrect && "border-primary/70 bg-primary/18",
                          isWrong && "border-destructive/50 bg-destructive/10",
                        )}
                      >
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <span className="grid h-8 w-8 place-items-center rounded-md border border-border bg-card text-sm font-semibold">
                            {index + 1}
                          </span>
                          {isCorrect ? (
                            <CheckCircle2 className="h-5 w-5 text-secondary" />
                          ) : isWrong ? (
                            <XCircle className="h-5 w-5 text-destructive" />
                          ) : null}
                        </div>
                        <p className="text-sm font-semibold leading-6">{option}</p>
                      </motion.button>
                    );
                  })}
                </div>

                {selected !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="game-tile mt-5 bg-primary/10 p-4 text-sm leading-6"
                  >
                    {question.explanation}
                  </motion.div>
                )}
              </motion.section>
            ) : (
              <motion.section
                key="result"
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="game-surface bg-card p-5 text-center md:p-7"
              >
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-md border border-primary/30 bg-primary text-primary-foreground">
                  <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
                </div>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Sessao concluida</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-normal">{result?.attempt.accuracy ?? 0}% de precisao</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Voce recebeu {result?.xpEarned ?? 0} pontos secundarios nesta conclusao.
                </p>
                {unlockedBadges.length > 0 && (
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {unlockedBadges.map((badge) => {
                      const Icon = badge.icon;
                      return (
                        <span
                          key={badge.id}
                          className="game-chip inline-flex items-center gap-1.5 bg-primary/12 px-3 py-1.5 text-sm font-semibold text-secondary"
                        >
                          <Icon className="h-4 w-4" aria-hidden="true" />
                          {badge.name}
                        </span>
                      );
                    })}
                  </div>
                )}
                <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <Button onClick={restart} variant="outline">
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Repetir
                  </Button>
                  <Button asChild>
                    <Link href={`/games/${category.slug}`}>Voltar para categoria</Link>
                  </Button>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </main>

        <aside className="space-y-4 xl:sticky xl:top-28 xl:self-start">
          <Surface>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Objetivo</p>
            <h2 className="mt-1 text-xl font-semibold tracking-normal">{game.skill}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Concluir com alta precisao aumenta o dominio registrado. Repetir no mesmo dia concede XP reduzido.
            </p>
          </Surface>
          <Surface>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Feedback</p>
            <div className="mt-3 space-y-2">
              <div className="game-tile bg-background/58 p-3 text-sm text-muted-foreground">
                Resposta correta libera explicacao imediata.
              </div>
              <div className="game-tile bg-background/58 p-3 text-sm text-muted-foreground">
                O melhor desempenho define seu progresso no card.
              </div>
            </div>
          </Surface>
        </aside>
      </div>
    </div>
  );
}
