"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import useSound from "use-sound";
import { Check, Clock, Flame, X } from "lucide-react";

import type { GameCategory, GameCompletion, GameDefinition } from "@/features/gamification/types";
import { masteryForHub, selectItemsBySkill } from "@/features/gamification/adaptive";
import { EngineResult } from "@/games/_engines/EngineResult";
import { GameSessionShell, Chip } from "@/game-pages/games/components/GameSessionShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game-store";
import { useReshuffledQuestions } from "@/hooks/useReshuffledQuestions";
import { cn } from "@/utils";

/** Erros que encerram a rodada infinita antes do tempo acabar. */
const MAX_ROUND_ERRORS = 3;

/** Delay (ms) antes de avançar para a próxima rodada, exibindo o feedback certo/errado. */
const NEXT_ROUND_DELAY_MS = { correct: 620, wrong: 1250 };

type AnswerLog = {
  questionId: string;
  prompt: string;
  selected: string;
  correctAnswer: string;
  explanation: string;
  correct: boolean;
};

/**
 * Engine generico de "rodada infinita cronometrada": combo, timer decrescente,
 * 3 strikes encerram, revisao de erros. Dirigido por `game.questions`.
 */
export function TimedRushSession({ game, category }: { game: GameDefinition; category: GameCategory }) {
  const completeGame = useGameStore((state) => state.completeGame);
  const adaptive = useGameStore((state) => state.adaptive);
  const [round, setRound] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [answerLog, setAnswerLog] = useState<AnswerLog[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [timeLeft, setTimeLeft] = useState(getRoundDuration());
  const [result, setResult] = useState<GameCompletion | null>(null);
  const [attempt, setAttempt] = useState(0);
  const { playCorrect, playWrong } = useGameSounds();

  // `attempt` força reordenar/reembaralhar a cada "Repetir" — sem isso o useMemo reaproveitava a
  // mesma ordem/posição da 1ª tentativa em replays no mesmo componente montado.
  const orderedPool = useMemo(() => {
    const pool = game.questions ?? [];
    const hub = game.hubs?.[0];
    const hasSignal = hub ? (adaptive.weaknessSignals[hub] ?? 0) > 0 || masteryForHub(adaptive, hub) > 0 : false;
    return hasSignal ? selectItemsBySkill(pool, masteryForHub(adaptive, hub!), pool.length) : pool;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.questions, game.hubs, adaptive, attempt]);
  // Rodada infinita: `round` cresce sem parar e cicla pelo pool via módulo. Sem incluir a volta
  // (`lap`) na chave, a ordem embaralhada do pool se repetia idêntica a cada nova volta na mesma
  // sessão — a resposta caía sempre na mesma posição a partir da 2ª volta em diante.
  const lap = orderedPool.length ? Math.floor(round / orderedPool.length) : 0;
  const questionPool = useReshuffledQuestions(orderedPool, attempt + lap);
  const question = questionPool.length ? questionPool[round % questionPool.length] : undefined;
  const difficultyStage = Math.min(5, Math.floor(round / 5));
  const roundDuration = getRoundDuration();
  const errors = useMemo(() => answerLog.filter((answer) => !answer.correct), [answerLog]);
  const correctCount = answerLog.length - errors.length;
  const accuracy = answerLog.length ? Math.round((correctCount / answerLog.length) * 100) : 100;

  const finishRound = useCallback(
    (log = answerLog) => {
      if (result || log.length === 0) return;
      const score = log.filter((answer) => answer.correct).length;
      const completion = completeGame(game, score, log.length, seconds);
      setResult(completion);
    },
    [answerLog, completeGame, game, result, seconds],
  );

  const goNextRound = useCallback(() => {
    const nextRound = round + 1;
    setRound(nextRound);
    setSelected(null);
    setFeedback(null);
    setTimeLeft(getRoundDuration());
  }, [round]);

  const answer = useCallback(
    (index: number, timedOut = false) => {
      if (selected !== null || feedback || result || !question) return;
      const isCorrect = !timedOut && index === question.answerIndex;
      const nextCombo = isCorrect ? combo + 1 : 0;
      const selectedLabel = timedOut ? "Tempo esgotado" : (question.options[index] ?? "Sem resposta");
      const nextAnswer: AnswerLog = {
        questionId: question.id,
        prompt: question.prompt,
        selected: selectedLabel,
        correctAnswer: question.options[question.answerIndex],
        explanation: question.explanation,
        correct: isCorrect,
      };
      const nextLog = [...answerLog, nextAnswer];
      const nextErrors = nextLog.filter((item) => !item.correct).length;

      setSelected(index);
      setFeedback(isCorrect ? "correct" : "wrong");
      setAnswerLog(nextLog);

      if (isCorrect) {
        playCorrect();
        setCombo(nextCombo);
        setMaxCombo((value) => Math.max(value, nextCombo));
      } else {
        playWrong();
        setCombo(0);
      }

      window.setTimeout(
        () => {
          if (nextErrors >= MAX_ROUND_ERRORS) {
            finishRound(nextLog);
            return;
          }
          goNextRound();
        },
        isCorrect ? NEXT_ROUND_DELAY_MS.correct : NEXT_ROUND_DELAY_MS.wrong,
      );
    },
    [answerLog, combo, feedback, finishRound, goNextRound, playCorrect, playWrong, question, result, selected],
  );

  useEffect(() => {
    if (result || feedback) return;
    const timer = window.setInterval(() => {
      setSeconds((value) => value + 1);
      setTimeLeft((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [feedback, result]);

  useEffect(() => {
    if (result || feedback || selected !== null || timeLeft > 0) return;
    const id = window.setTimeout(() => answer(-1, true), 0);
    return () => window.clearTimeout(id);
  }, [answer, feedback, result, selected, timeLeft]);

  function restart() {
    setRound(0);
    setSelected(null);
    setFeedback(null);
    setCombo(0);
    setMaxCombo(0);
    setAnswerLog([]);
    setSeconds(0);
    setTimeLeft(getRoundDuration());
    setResult(null);
    setAttempt((value) => value + 1);
  }

  if (!question) {
    return (
      <section className="game-surface bg-card p-6 text-center">
        <h1 className="text-2xl font-semibold">Atividade sem questões</h1>
        <Button asChild className="mt-4">
          <Link href={`/games/${category.slug}`}>Voltar à categoria</Link>
        </Button>
      </section>
    );
  }

  return (
    <GameSessionShell
      categoryName={category.name}
      categorySlug={category.slug}
      title={game.name}
      step={roundDuration - timeLeft}
      total={roundDuration}
      extraChips={
        <>
          <Chip>
            <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {timeLeft}s
          </Chip>
          <Chip>
            <Flame className="h-3.5 w-3.5" aria-hidden="true" /> {combo}x
          </Chip>
          <Chip>{errors.length}/{MAX_ROUND_ERRORS} erros</Chip>
        </>
      }
    >
      <div className="force-light">
        <div className="mx-auto flex min-h-[70dvh] max-w-2xl flex-col items-center justify-center text-center md:min-h-[75dvh]">
        <AnimatePresence mode="wait">
          {!result && (
            <motion.div
              key={`${question.id}-${round}`}
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, scale: 0.98 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="w-full"
            >
              <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
                <Badge className="border-primary/20 bg-primary/10 text-primary">{game.skill}</Badge>
                <Badge variant="outline">Velocidade {difficultyStage + 1}</Badge>
                <Badge variant="outline">Rodada {round + 1}</Badge>
              </div>

              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Decida rápido</p>
              <div
                className={cn(
                  "mt-4 rounded-3xl border bg-card px-8 py-6 shadow-elevated md:px-12 md:py-10",
                  feedback === "correct" ? "border-emerald-500/45" : feedback === "wrong" ? "border-destructive/45" : "border-transparent",
                )}
              >
                <h2 className="font-display text-2xl font-semibold leading-snug tracking-normal text-foreground md:text-4xl">
                  {question.prompt}
                </h2>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {question.options.map((option, index) => {
                  const isSelected = selected === index;
                  const isCorrectOption = feedback !== null && index === question.answerIndex;
                  const isWrong = isSelected && feedback === "wrong";
                  return (
                    <motion.button
                      key={`${question.id}-${option}`}
                      type="button"
                      onClick={() => answer(index)}
                      disabled={feedback !== null}
                      whileHover={feedback === null ? { y: -4, scale: 1.012 } : undefined}
                      whileTap={feedback === null ? { scale: 0.985 } : undefined}
                      className={cn(
                        "min-h-16 rounded-2xl border border-border bg-card px-6 py-5 text-left text-base font-semibold leading-6 tracking-normal text-foreground shadow-soft transition-all duration-200 hover:bg-primary/10 md:text-lg",
                        isCorrectOption && "border-emerald-500/55 bg-emerald-500/10",
                        isWrong && "border-destructive/55 bg-destructive/10",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span>{option}</span>
                        {isCorrectOption ? (
                          <Check className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
                        ) : isWrong ? (
                          <X className="h-5 w-5 shrink-0 text-red-700" aria-hidden="true" />
                        ) : null}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <AnimatePresence>
                {feedback && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className={cn(
                      "mt-5 rounded-2xl border p-4 text-left text-sm leading-6",
                      feedback === "correct"
                        ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-800"
                        : "border-destructive/25 bg-destructive/10 text-red-800",
                    )}
                  >
                    {feedback === "correct" ? "Boa. " : "Revise: "}
                    {question.explanation}
                  </motion.div>
                )}
              </AnimatePresence>

              <Button
                onClick={() => finishRound()}
                disabled={answerLog.length === 0 || result !== null}
                variant="outline"
                className="mt-5"
              >
                Encerrar rodada
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>

      <div className="force-light">
      <EngineResult
        result={result}
        decoration={<ConfettiBurst />}
        eyebrow="Rodada finalizada"
        review={errors.slice(0, 3).map((error) => ({
          id: error.questionId,
          text: `${error.selected} -> correto: ${error.correctAnswer} — ${error.explanation}`,
        }))}
        onRestart={restart}
        categorySlug={category.slug}
      >
        <div className="relative mt-6 grid grid-cols-3 gap-3">
          <SideMetric label="Max combo" value={`${maxCombo}x`} />
          <SideMetric label="Acerto" value={`${accuracy}%`} />
          <SideMetric label="Erros" value={`${errors.length}`} />
        </div>
      </EngineResult>
      </div>
    </GameSessionShell>
  );
}

function SideMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="game-tile bg-background/58 p-3">
      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ConfettiBurst() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {confettiPieces.map((piece, index) => (
        <motion.span
          key={`${piece.left}-${piece.delay}`}
          initial={{ opacity: 0, y: -12, rotate: 0 }}
          animate={{ opacity: [0, 1, 0], y: 160 + piece.travel, rotate: piece.rotate }}
          transition={{ delay: piece.delay, duration: 1.15, ease: "easeOut" }}
          className={cn(
            "absolute top-0 h-2 w-1 rounded-full",
            index % 3 === 0 ? "bg-primary" : index % 3 === 1 ? "bg-emerald-300" : "bg-zinc-100",
          )}
          style={{ left: `${piece.left}%` }}
        />
      ))}
    </div>
  );
}

function useGameSounds() {
  const correctTone = useMemo(() => (typeof window === "undefined" ? "" : createToneDataUri([740, 980], 120)), []);
  const wrongTone = useMemo(() => (typeof window === "undefined" ? "" : createToneDataUri([220, 180], 150)), []);
  const [playCorrect] = useSound(correctTone, { volume: 0.24, interrupt: true });
  const [playWrong] = useSound(wrongTone, { volume: 0.18, interrupt: true });
  return { playCorrect, playWrong };
}

function createToneDataUri(frequencies: number[], durationMs: number) {
  const sampleRate = 11025;
  const sampleCount = Math.floor((sampleRate * durationMs) / 1000);
  const buffer = new ArrayBuffer(44 + sampleCount * 2);
  const view = new DataView(buffer);
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + sampleCount * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, sampleCount * 2, true);

  for (let i = 0; i < sampleCount; i += 1) {
    const t = i / sampleRate;
    const attack = Math.min(1, i / (sampleRate * 0.012));
    const release = Math.min(1, (sampleCount - i) / (sampleRate * 0.035));
    const envelope = attack * release;
    const tone = frequencies.reduce((sum, frequency) => sum + Math.sin(2 * Math.PI * frequency * t), 0) / frequencies.length;
    view.setInt16(44 + i * 2, tone * envelope * 0.28 * 32767, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return `data:audio/wav;base64,${window.btoa(binary)}`;
}

function writeString(view: DataView, offset: number, value: string) {
  for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
}

const ROUND_DURATION_SECONDS = 90;
function getRoundDuration() {
  return ROUND_DURATION_SECONDS;
}

const confettiPieces = [
  { left: 12, delay: 0.05, travel: 18, rotate: 120 },
  { left: 18, delay: 0.12, travel: 34, rotate: -90 },
  { left: 24, delay: 0.02, travel: 22, rotate: 180 },
  { left: 31, delay: 0.15, travel: 44, rotate: -140 },
  { left: 38, delay: 0.08, travel: 28, rotate: 160 },
  { left: 46, delay: 0.18, travel: 38, rotate: -120 },
  { left: 54, delay: 0.04, travel: 26, rotate: 140 },
  { left: 62, delay: 0.13, travel: 42, rotate: -180 },
  { left: 70, delay: 0.07, travel: 24, rotate: 90 },
  { left: 78, delay: 0.17, travel: 36, rotate: -160 },
  { left: 86, delay: 0.1, travel: 30, rotate: 130 },
];
