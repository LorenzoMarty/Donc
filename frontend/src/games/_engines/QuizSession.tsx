"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";

import { selectAdaptivePool } from "@/features/gamification/adaptive";
import type { GameCategory, GameDefinition } from "@/features/gamification/types";
import { readReturnTo } from "@/games/_engines/EngineResult";
import { shuffle } from "@/games/_engines/shuffleOptions";
import { GameSessionShell } from "@/game-pages/games/components/GameSessionShell";
import { useReshuffledQuestions } from "@/hooks/useReshuffledQuestions";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game-store";
import { useTrackEvent } from "@/hooks/use-track-event";
import { cn } from "@/utils";

/** Delay (ms) antes de avançar para a próxima questão, exibindo o feedback certo/errado. */
const NEXT_QUESTION_DELAY_MS = 620;

/**
 * Engine `quiz`/`choice`: múltipla escolha simples, uma pergunta por vez.
 *
 * `preview` (P3a REQ-8): usado pelo admin pra visualizar um jogo em edição como o aluno veria —
 * não chama `completeGame`/`trackEvent` (não grava tentativa nem afeta progresso/adaptativo), e
 * troca a navegação de saída por `onExit`.
 */
export function QuizSession({
  game,
  category,
  preview = false,
  onExit,
}: {
  game: GameDefinition;
  category: GameCategory;
  preview?: boolean;
  onExit?: () => void;
}) {
  const returnTo = readReturnTo();
  const completeGame = useGameStore((state) => state.completeGame);
  const adaptive = useGameStore((state) => state.adaptive);
  const trackEvent = useTrackEvent();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [result, setResult] = useState<ReturnType<typeof completeGame> | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [attempt, setAttempt] = useState(0);

  // Questoes selecionadas por dificuldade compativel com a maestria do aluno no hub (quando ha
  // sinal); sem sinal, cai no sorteio puro de sempre. `attempt` força reordenar/reembaralhar a
  // cada "Repetir" — sem isso, o useMemo reaproveitava a mesma ordem/posição da 1ª tentativa.
  const orderedQuestions = useMemo(() => {
    if (!game.questions) return [];
    return selectAdaptivePool(game, game.questions, adaptive, shuffle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, adaptive, attempt]);
  const questions = useReshuffledQuestions(orderedQuestions, attempt);

  useEffect(() => {
    if (result) return;
    const id = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [result]);

  useEffect(() => {
    if (preview) return;
    trackEvent({ event_type: "game_started", entity_id: game.id, entity_type: "game" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.id, preview]);

  const question = questions[step];

  function answer(index: number) {
    if (!question || selected !== null || result) return;
    const isCorrect = index === question.answerIndex;
    setSelected(index);
    const nextAnswers = [...answers, isCorrect];
    window.setTimeout(() => {
      if (step < questions.length - 1) {
        setAnswers(nextAnswers);
        setStep((value) => value + 1);
        setSelected(null);
        return;
      }
      setAnswers(nextAnswers);
      const correctCount = nextAnswers.filter(Boolean).length;
      if (preview) {
        setResult({ attempt: { id: "preview", gameId: game.id, category: game.category, score: correctCount, total: questions.length, accuracy: questions.length ? Math.round((correctCount / questions.length) * 100) : 0, playedAt: new Date().toISOString(), durationSeconds: seconds } });
        return;
      }
      const completion = completeGame(game, correctCount, questions.length, seconds);
      setResult(completion);
      trackEvent({ event_type: "game_completed", entity_id: game.id, entity_type: "game", duration_ms: seconds * 1000, meta: { accuracy: completion.attempt.accuracy } });
    }, NEXT_QUESTION_DELAY_MS);
  }

  function restart() {
    setStep(0);
    setSelected(null);
    setAnswers([]);
    setResult(null);
    setSeconds(0);
    setAttempt((value) => value + 1);
  }

  return (
    <GameSessionShell
      categoryName={category.name}
      categorySlug={category.slug}
      title={game.name}
      step={Math.min(step + 1, questions.length)}
      total={questions.length}
      onClose={preview ? onExit : undefined}
    >
      <div className="force-light">
        <main className="mx-auto flex min-h-[70dvh] max-w-2xl flex-col items-center justify-center text-center md:min-h-[75dvh]">
          <AnimatePresence mode="wait">
            {!result && question ? (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.98 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
                className="w-full"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Questao {step + 1} de {questions.length}
                </p>
                <div className="mt-4 rounded-3xl bg-card px-8 py-6 shadow-elevated md:px-12 md:py-10">
                  <h2 className="font-display text-2xl font-semibold leading-snug tracking-normal md:text-4xl">
                    {question.prompt}
                  </h2>
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
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
                        animate={
                          isWrong
                            ? { x: [-5, 5, -4, 4, -2, 2, 0] }
                            : isCorrect
                              ? { scale: [1, 1.05, 0.97, 1] }
                              : { x: 0, scale: 1 }
                        }
                        transition={{ duration: 0.38, ease: "easeOut" }}
                        className={cn(
                          "min-h-16 rounded-2xl border border-border bg-card px-6 py-5 text-left text-base font-semibold leading-6 shadow-soft transition-colors md:text-lg",
                          isCorrect && "border-primary/70 bg-primary/18",
                          isWrong && "border-warning/50 bg-warning/10",
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span>{option}</span>
                          {isCorrect ? (
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                          ) : isWrong ? (
                            <XCircle className="h-5 w-5 shrink-0 text-warning" />
                          ) : null}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {selected !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-5 rounded-2xl bg-primary/10 p-4 text-sm leading-6"
                  >
                    {question.explanation}
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full rounded-3xl bg-card px-5 py-6 shadow-elevated md:px-7 md:py-8"
              >
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-md border border-primary/30 bg-primary text-primary-foreground">
                  <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
                </div>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Sessão concluída</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-normal">{result?.attempt.accuracy ?? 0}% de precisão</h2>
                <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <Button onClick={restart} variant="outline">
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Repetir
                  </Button>
                  {preview ? (
                    <Button onClick={onExit}>Fechar pré-visualização</Button>
                  ) : (
                    <Button asChild>
                      <Link href={returnTo ?? `/games/${category.slug}`}>
                        {returnTo ? "Próximo exercício" : "Voltar para categoria"}
                      </Link>
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </GameSessionShell>
  );
}
