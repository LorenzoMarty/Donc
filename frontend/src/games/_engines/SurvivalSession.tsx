"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Clock, Flame, Heart, X } from "lucide-react";

import { getAllGames, getGameById } from "@/features/gamification/catalog";
import type { GameCategory, GameCompletion, GameDefinition, GameQuestion } from "@/features/gamification/types";
import { EngineResult } from "@/games/_engines/EngineResult";
import { shuffle, shuffleQuestionOptions } from "@/games/_engines/shuffleOptions";
import { GameSessionShell, Chip } from "@/game-pages/games/components/GameSessionShell";
import { INPUT_GRACE_MS } from "@/games/_engines/timing";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game-store";
import { cn } from "@/utils";

const RUN_LENGTH = 30;
const MAX_STRIKES = 5;

/** Duração da rodada (s): começa em `ROUND_DURATION_START` e cai 1s a cada `ROUND_DURATION_STEP`
 * itens respondidos, sem nunca ficar abaixo de `ROUND_DURATION_MIN` — pressão crescente. */
const ROUND_DURATION_MIN = 5;
const ROUND_DURATION_START = 12;
const ROUND_DURATION_STEP = 5;
function roundDuration(index: number) {
  return Math.max(ROUND_DURATION_MIN, ROUND_DURATION_START - Math.floor(index / ROUND_DURATION_STEP));
}

/** Delay (ms) antes de avançar para o próximo item, exibindo o feedback certo/errado. */
const NEXT_ROUND_DELAY_MS = { correct: 480, wrong: 900 };

/** Engine `survival`: maratona agregada de vários jogos, timer agressivo e vidas limitadas. */
export function SurvivalSession({ game, category }: { game: GameDefinition; category: GameCategory }) {
  const completeGame = useGameStore((state) => state.completeGame);
  const remoteGames = useGameStore((state) => state.remoteGames);

  const [attempt, setAttempt] = useState(0);
  // `attempt` força reembaralhar (pool e alternativas) a cada "Repetir" — sem isso o useMemo
  // reaproveitava a mesma seleção/ordem/posição da 1ª tentativa em replays no mesmo componente
  // montado, fazendo a resposta certa parecer sempre no mesmo lugar.
  const questions = useMemo<GameQuestion[]>(() => {
    const pool = game.survival?.poolGameIds?.length
      ? game.survival.poolGameIds.map((id) => getGameById(id, remoteGames)).filter(Boolean as unknown as (g: GameDefinition | undefined) => g is GameDefinition)
      : getAllGames(remoteGames).filter((g) => g.id !== game.id && (g.questions?.length ?? 0) > 0);
    const all = pool.flatMap((g) => g.questions ?? []);
    return shuffle(all).slice(0, RUN_LENGTH).map(shuffleQuestionOptions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, attempt, remoteGames]);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(roundDuration(0));
  const [result, setResult] = useState<GameCompletion | null>(null);

  const question = questions[index];
  const finishedRef = result !== null;

  const finish = useCallback(
    (answered: number, finalScore: number) => {
      if (result) return;
      setResult(completeGame(game, finalScore, Math.max(1, answered), 0));
    },
    [completeGame, game, result],
  );

  const answer = useCallback(
    (choice: number, timedOut = false) => {
      if (selected !== null || result || !question) return;
      const correct = !timedOut && choice === question.answerIndex;
      setSelected(choice);
      const nextStrikes = correct ? strikes : strikes + 1;
      const nextScore = correct ? score + 1 : score;
      const nextCombo = correct ? combo + 1 : 0;
      if (correct) {
        setScore(nextScore);
        setCombo(nextCombo);
        setMaxCombo((v) => Math.max(v, nextCombo));
      } else {
        setStrikes(nextStrikes);
        setCombo(0);
      }
      const answered = index + 1;
      window.setTimeout(() => {
        if (nextStrikes >= MAX_STRIKES || answered >= questions.length) {
          finish(answered, nextScore);
          return;
        }
        setIndex(answered);
        setSelected(null);
        setTimeLeft(roundDuration(answered));
      }, correct ? NEXT_ROUND_DELAY_MS.correct : NEXT_ROUND_DELAY_MS.wrong);
    },
    [combo, finish, index, question, questions.length, result, score, selected, strikes],
  );

  useEffect(() => {
    if (result || selected !== null) return;
    const timer = window.setInterval(() => setTimeLeft((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [result, selected, index]);

  useEffect(() => {
    if (result || selected !== null || timeLeft > 0) return;
    const id = window.setTimeout(() => answer(-1, true), INPUT_GRACE_MS);
    return () => window.clearTimeout(id);
  }, [answer, result, selected, timeLeft]);

  function restart() {
    setIndex(0);
    setSelected(null);
    setCombo(0);
    setMaxCombo(0);
    setStrikes(0);
    setScore(0);
    setTimeLeft(roundDuration(0));
    setResult(null);
    setAttempt((value) => value + 1);
  }

  if (questions.length === 0) {
    return (
      <section className="game-surface bg-card p-6 text-center">
        <h1 className="text-2xl font-semibold">Sem questões para a maratona</h1>
        <Button asChild className="mt-4"><Link href={`/games/${category.slug}`}>Voltar à categoria</Link></Button>
      </section>
    );
  }

  return (
    <GameSessionShell
      categoryName={category.name}
      categorySlug={category.slug}
      title={game.name}
      step={index}
      total={questions.length}
      extraChips={
        <>
          <Chip>
            <Heart className="h-3.5 w-3.5" aria-hidden="true" /> {MAX_STRIKES - strikes}
          </Chip>
          <Chip>
            <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {timeLeft}s
          </Chip>
          <Chip>
            <Flame className="h-3.5 w-3.5" aria-hidden="true" /> {combo}x
          </Chip>
        </>
      }
    >
      <div className="force-light">
      {question && !finishedRef && (
        <div className="mx-auto flex min-h-[70dvh] max-w-2xl flex-col items-center justify-center text-center md:min-h-[75dvh]">
        <AnimatePresence mode="wait">
          <motion.div key={index} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full">
            <div className="rounded-3xl bg-card px-8 py-6 shadow-elevated md:px-12 md:py-10">
              <h2 className="font-display text-2xl font-semibold leading-snug tracking-normal md:text-4xl">{question.prompt}</h2>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {question.options.map((option, i) => {
                const isRight = selected !== null && i === question.answerIndex;
                const isWrong = selected === i && i !== question.answerIndex;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => answer(i)}
                    disabled={selected !== null}
                    className={cn(
                      "min-h-16 rounded-2xl border border-border bg-card px-6 py-5 text-left text-base font-medium leading-6 shadow-soft transition-colors md:text-lg",
                      selected === null && "hover:border-primary/50 hover:bg-primary/5",
                      isRight && "border-emerald-500/55 bg-emerald-500/10",
                      isWrong && "border-warning/55 bg-warning/10",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span>{option}</span>
                      {isRight ? <Check className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" /> : isWrong ? <X className="h-5 w-5 shrink-0 text-warning" aria-hidden="true" /> : null}
                    </div>
                  </button>
                );
              })}
            </div>
            {selected !== null && question.explanation && (
              <p className="mt-5 rounded-2xl border border-primary/15 bg-primary/5 p-4 text-left text-sm leading-6 text-muted-foreground">{question.explanation}</p>
            )}
          </motion.div>
        </AnimatePresence>
        </div>
      )}

      <div className="force-light">
        <EngineResult
          result={result}
          headline={`${score} acertos`}
          subline={`Combo máximo ${maxCombo}x · ${strikes >= MAX_STRIKES ? "vidas esgotadas" : "maratona concluída"}.`}
          onRestart={restart}
          categorySlug={category.slug}
        />
      </div>
      </div>
    </GameSessionShell>
  );
}
