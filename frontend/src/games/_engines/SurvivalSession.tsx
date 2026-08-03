"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Clock, Flame, Heart, X, Zap } from "lucide-react";

import { getAllGames, getGameById } from "@/features/gamification/catalog";
import type { GameCategory, GameCompletion, GameDefinition, GameQuestion } from "@/features/gamification/types";
import { EngineResult } from "@/games/_engines/EngineResult";
import { shuffle, shuffleQuestionOptions } from "@/games/_engines/shuffleOptions";
import { PageHeader } from "@/components/shared/premium-ui";
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

/** XP ao vivo por acerto: base + bônus de combo (capado). */
const LIVE_XP_BASE = 3;
const LIVE_XP_COMBO_MULTIPLIER = 2;
const LIVE_XP_COMBO_CAP = 10;

/** Delay (ms) antes de avançar para o próximo item, exibindo o feedback certo/errado. */
const NEXT_ROUND_DELAY_MS = { correct: 480, wrong: 900 };

/** Engine `survival`: maratona agregada de vários jogos, timer agressivo e vidas limitadas. */
export function SurvivalSession({ game, category }: { game: GameDefinition; category: GameCategory }) {
  const completeGame = useGameStore((state) => state.completeGame);
  const xp = useGameStore((state) => state.xp);

  const [attempt, setAttempt] = useState(0);
  // `attempt` força reembaralhar (pool e alternativas) a cada "Repetir" — sem isso o useMemo
  // reaproveitava a mesma seleção/ordem/posição da 1ª tentativa em replays no mesmo componente
  // montado, fazendo a resposta certa parecer sempre no mesmo lugar.
  const questions = useMemo<GameQuestion[]>(() => {
    const pool = game.survival?.poolGameIds?.length
      ? game.survival.poolGameIds.map((id) => getGameById(id)).filter(Boolean as unknown as (g: GameDefinition | undefined) => g is GameDefinition)
      : getAllGames().filter((g) => g.id !== game.id && (g.questions?.length ?? 0) > 0);
    const all = pool.flatMap((g) => g.questions ?? []);
    return shuffle(all).slice(0, RUN_LENGTH).map(shuffleQuestionOptions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, attempt]);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [score, setScore] = useState(0);
  const [sessionXp, setSessionXp] = useState(0);
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
        setSessionXp((v) => v + LIVE_XP_BASE + Math.min(LIVE_XP_COMBO_CAP, nextCombo * LIVE_XP_COMBO_MULTIPLIER));
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
    const id = window.setTimeout(() => answer(-1, true), 0);
    return () => window.clearTimeout(id);
  }, [answer, result, selected, timeLeft]);

  function restart() {
    setIndex(0);
    setSelected(null);
    setCombo(0);
    setMaxCombo(0);
    setStrikes(0);
    setScore(0);
    setSessionXp(0);
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
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        eyebrow={category.name}
        title={game.name}
        description={game.description}
        action={
          <Button asChild variant="outline">
            <Link href={`/games/${category.slug}`}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Categoria
            </Link>
          </Button>
        }
      />

      <section className="game-surface bg-card p-4 md:p-5">
        <div className="grid grid-cols-2 gap-2 xs:grid-cols-4">
          <Metric icon={<Heart className="h-4 w-4" aria-hidden="true" />} label="Vidas" value={`${MAX_STRIKES - strikes}`} />
          <Metric icon={<Flame className="h-4 w-4" aria-hidden="true" />} label="Combo" value={`${combo}x`} />
          <Metric icon={<Zap className="h-4 w-4" aria-hidden="true" />} label="XP" value={`${xp + sessionXp}`} />
          <Metric icon={<Clock className="h-4 w-4" aria-hidden="true" />} label="Timer" value={`${timeLeft}s`} />
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.round((index / questions.length) * 100)}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Item {Math.min(index + 1, questions.length)} de {questions.length} · {MAX_STRIKES} vidas · velocidade crescente</p>
      </section>

      {question && !finishedRef && (
        <AnimatePresence mode="wait">
          <motion.section key={index} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="game-surface bg-card p-4 md:p-6">
            <h2 className="text-xl font-semibold leading-7 tracking-normal md:text-2xl">{question.prompt}</h2>
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
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
                      "game-tile min-h-20 bg-background/64 p-4 text-left text-sm font-medium leading-6 transition-colors",
                      selected === null && "hover:border-primary/50 hover:bg-primary/5",
                      isRight && "border-emerald-500/55 bg-emerald-500/10",
                      isWrong && "border-destructive/55 bg-destructive/10",
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="grid h-7 w-7 place-items-center rounded-md border border-border bg-card text-xs font-semibold">{i + 1}</span>
                      {isRight ? <Check className="h-4 w-4 text-emerald-700" aria-hidden="true" /> : isWrong ? <X className="h-4 w-4 text-red-700" aria-hidden="true" /> : null}
                    </div>
                    {option}
                  </button>
                );
              })}
            </div>
            {selected !== null && question.explanation && (
              <p className="mt-4 rounded-md border border-primary/15 bg-primary/5 p-3 text-sm leading-6 text-muted-foreground">{question.explanation}</p>
            )}
          </motion.section>
        </AnimatePresence>
      )}

      <EngineResult
        result={result}
        headline={`${score} acertos`}
        subline={`Combo máximo ${maxCombo}x · ${strikes >= MAX_STRIKES ? "vidas esgotadas" : "maratona concluída"}.`}
        onRestart={restart}
        categorySlug={category.slug}
      />
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="game-tile bg-background/58 px-3 py-2">
      <p className="flex items-center gap-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
