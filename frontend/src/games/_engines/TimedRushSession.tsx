"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import useSound from "use-sound";
import { ArrowLeft, Check, Clock, Flame, RotateCcw, Target, Trophy, X, Zap } from "lucide-react";

import type { GameCategory, GameCompletion, GameDefinition } from "@/features/gamification/types";
import { masteryForHub, selectItemsBySkill } from "@/features/gamification/adaptive";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game-store";
import { useReshuffledQuestions } from "@/hooks/useReshuffledQuestions";
import { cn } from "@/utils";

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
 * 3 strikes encerram, XP ao vivo e revisao de erros. Dirigido por `game.questions`.
 */
export function TimedRushSession({ game, category }: { game: GameDefinition; category: GameCategory }) {
  const completeGame = useGameStore((state) => state.completeGame);
  const xp = useGameStore((state) => state.xp);
  const adaptive = useGameStore((state) => state.adaptive);
  const [round, setRound] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [sessionXp, setSessionXp] = useState(0);
  const [lastXpGain, setLastXpGain] = useState(0);
  const [xpPulseKey, setXpPulseKey] = useState(0);
  const [answerLog, setAnswerLog] = useState<AnswerLog[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [timeLeft, setTimeLeft] = useState(getRoundDuration());
  const [result, setResult] = useState<GameCompletion | null>(null);
  const [leveledUp, setLeveledUp] = useState(false);
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
  const errors = answerLog.filter((answer) => !answer.correct);
  const correctCount = answerLog.length - errors.length;
  const accuracy = answerLog.length ? Math.round((correctCount / answerLog.length) * 100) : 100;
  const progress = Math.min(100, Math.round((timeLeft / roundDuration) * 100));

  const finishRound = useCallback(
    (log = answerLog) => {
      if (result || log.length === 0) return;
      const score = log.filter((answer) => answer.correct).length;
      const completion = completeGame(game, score, log.length, seconds);
      setLeveledUp(completion.rankUp);
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
      const xpGain = isCorrect ? getLiveXpGain(nextCombo, difficultyStage) : 0;
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
        setSessionXp((value) => value + xpGain);
        setLastXpGain(xpGain);
        setXpPulseKey((value) => value + 1);
      } else {
        playWrong();
        setCombo(0);
      }

      window.setTimeout(
        () => {
          if (nextErrors >= 3) {
            finishRound(nextLog);
            return;
          }
          goNextRound();
        },
        isCorrect ? 620 : 1250,
      );
    },
    [answerLog, combo, difficultyStage, feedback, finishRound, goNextRound, playCorrect, playWrong, question, result, selected],
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
    setSessionXp(0);
    setLastXpGain(0);
    setXpPulseKey(0);
    setAnswerLog([]);
    setSeconds(0);
    setTimeLeft(getRoundDuration());
    setResult(null);
    setLeveledUp(false);
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
    <div className="space-y-5 md:space-y-6">
      <div className="space-y-5 md:space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Button asChild variant="outline" className="mb-5">
              <Link href={`/games/${category.slug}`}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Categoria
              </Link>
            </Button>
            <Badge className="border-primary/20 bg-primary/10 text-primary">Modo infinito</Badge>
            <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-normal text-foreground md:text-4xl">
              {game.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">{game.description}</p>
          </div>
          <div className="game-tile bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
            Erre 3 vezes ou encerre a rodada para registrar o resultado.
          </div>
        </header>

        <RushHud
          combo={combo}
          xp={xp}
          sessionXp={sessionXp}
          lastXpGain={lastXpGain}
          xpPulseKey={xpPulseKey}
          timeLeft={timeLeft}
          roundDuration={roundDuration}
          round={round}
          progress={progress}
        />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,20.625rem)]">
          <main>
            <AnimatePresence mode="wait">
              {!result && (
                <motion.section
                  key={`${question.id}-${round}`}
                  initial={{ opacity: 0, y: 18, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -14, scale: 0.98 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className={cn(
                    "game-surface relative overflow-hidden bg-card p-4 md:p-6",
                    feedback === "correct" ? "border-emerald-500/45" : feedback === "wrong" ? "border-destructive/45" : "",
                  )}
                >
                  <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-primary/45" aria-hidden="true" />
                  <div className="mb-5 flex flex-wrap items-center gap-2">
                    <Badge className="border-primary/20 bg-primary/10 text-primary">{game.skill}</Badge>
                    <Badge variant="outline">Velocidade {difficultyStage + 1}</Badge>
                    <Badge variant="outline">Rodada {round + 1}</Badge>
                  </div>

                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Decida rápido</p>
                  <h2 className="mt-3 text-2xl font-semibold leading-tight tracking-normal text-foreground md:text-3xl">
                    {question.prompt}
                  </h2>

                  <div className="mt-7 grid gap-3 lg:grid-cols-2">
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
                            "game-tile min-h-24 bg-background/64 p-4 text-left transition-all duration-200 hover:bg-primary/10",
                            isCorrectOption && "border-emerald-500/55 bg-emerald-500/10",
                            isWrong && "border-destructive/55 bg-destructive/10",
                          )}
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <span className="grid h-8 w-8 place-items-center rounded-md border border-border bg-card text-sm font-semibold">
                              {index + 1}
                            </span>
                            {isCorrectOption ? (
                              <Check className="h-5 w-5 text-emerald-700" aria-hidden="true" />
                            ) : isWrong ? (
                              <X className="h-5 w-5 text-red-700" aria-hidden="true" />
                            ) : null}
                          </div>
                          <p className="text-base font-semibold leading-6 tracking-normal text-foreground">{option}</p>
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
                          "mt-5 rounded-md border p-4 text-sm leading-6",
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
                </motion.section>
              )}
            </AnimatePresence>
          </main>

          <aside className="space-y-4 xl:sticky xl:top-28 xl:self-start">
            <SidePanel title="Rodada atual" icon={<Target className="h-4 w-4" aria-hidden="true" />}>
              <div className="grid grid-cols-2 gap-2">
                <SideMetric label="Acertos" value={`${correctCount}`} />
                <SideMetric label="Erros" value={`${errors.length}/3`} />
                <SideMetric label="Max combo" value={`${maxCombo}x`} />
                <SideMetric label="Tempo" value={formatTime(seconds)} />
              </div>
              <Button
                onClick={() => finishRound()}
                disabled={answerLog.length === 0 || result !== null}
                variant="outline"
                className="mt-4 w-full"
              >
                Encerrar rodada
              </Button>
            </SidePanel>
          </aside>
        </div>
      </div>

      <ResultModal
        result={result}
        accuracy={accuracy}
        maxCombo={maxCombo}
        errors={errors}
        leveledUp={leveledUp}
        onRestart={restart}
        categorySlug={category.slug}
      />
    </div>
  );
}

function RushHud({
  combo,
  xp,
  sessionXp,
  lastXpGain,
  xpPulseKey,
  timeLeft,
  roundDuration,
  round,
  progress,
}: {
  combo: number;
  xp: number;
  sessionXp: number;
  lastXpGain: number;
  xpPulseKey: number;
  timeLeft: number;
  roundDuration: number;
  round: number;
  progress: number;
}) {
  return (
    <section className="game-surface relative overflow-hidden bg-card p-4 md:p-5">
      <div className="grid grid-cols-2 gap-2 xs:grid-cols-4 md:gap-3">
        <HudMetric icon={<Flame className="h-4 w-4" aria-hidden="true" />} label="Combo" value={`${combo}x`} />
        <HudMetric
          icon={<Zap className="h-4 w-4" aria-hidden="true" />}
          label="XP"
          value={`${xp + sessionXp}`}
          pulse={lastXpGain ? `+${lastXpGain}` : undefined}
          pulseKey={xpPulseKey}
        />
        <HudMetric icon={<Clock className="h-4 w-4" aria-hidden="true" />} label="Timer" value={`${timeLeft}s`} />
        <HudMetric icon={<Target className="h-4 w-4" aria-hidden="true" />} label="Rodada" value={`${round + 1}`} />
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold text-muted-foreground">
          <span>Progresso da rodada</span>
          <span>
            {timeLeft}s / {roundDuration}s
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full border border-border bg-muted/70">
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="h-full rounded-full bg-primary"
            style={{ filter: "drop-shadow(0 0 10px hsl(var(--primary) / 0.28))" }}
          />
        </div>
      </div>
    </section>
  );
}

function HudMetric({
  icon,
  label,
  value,
  pulse,
  pulseKey,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  pulse?: string;
  pulseKey?: number;
}) {
  return (
    <div className="game-tile relative bg-background/58 px-3 py-2">
      <p className="flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
      <AnimatePresence>
        {pulse && pulseKey ? (
          <motion.span
            key={pulseKey}
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: -4, scale: 1 }}
            exit={{ opacity: 0, y: -18 }}
            className="absolute right-3 top-2 text-xs font-semibold text-emerald-700"
          >
            {pulse}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function SidePanel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="game-surface bg-card p-4">
      <div className="mb-4 flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-md border border-primary/25 bg-primary/12 text-primary">{icon}</div>
        <h2 className="text-lg font-semibold tracking-normal text-foreground">{title}</h2>
      </div>
      {children}
    </section>
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

function ResultModal({
  result,
  accuracy,
  maxCombo,
  errors,
  leveledUp,
  onRestart,
  categorySlug,
}: {
  result: GameCompletion | null;
  accuracy: number;
  maxCombo: number;
  errors: AnswerLog[];
  leveledUp: boolean;
  onRestart: () => void;
  categorySlug: string;
}) {
  return (
    <AnimatePresence>
      {result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] grid place-items-center bg-foreground/28 p-3 backdrop-blur-sm xs:p-4"
        >
          <motion.section
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            className="game-surface mobile-scroll relative max-h-[92dvh] w-full max-w-2xl overflow-y-auto bg-card p-4 text-foreground xs:p-5 md:p-6"
          >
            <ConfettiBurst />
            <div className="relative text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-md border border-primary/30 bg-primary text-primary-foreground">
                <Trophy className="h-8 w-8" aria-hidden="true" />
              </div>
              {leveledUp && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mx-auto mt-4 w-fit rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary"
                >
                  Rank up - {result.rankName}
                </motion.div>
              )}
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Rodada finalizada</p>
              <h2 className="mt-2 text-4xl font-semibold tracking-normal">+{result.xpEarned} XP</h2>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SideMetric label="XP ganho" value={`+${result.xpEarned}`} />
              <SideMetric label="Max combo" value={`${maxCombo}x`} />
              <SideMetric label="Acerto" value={`${accuracy}%`} />
              <SideMetric label="Erros" value={`${errors.length}`} />
            </div>

            {errors.length > 0 && (
              <div className="game-tile mt-5 border-destructive/20 bg-destructive/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-700">Erros para revisar</p>
                <div className="mt-3 space-y-3">
                  {errors.slice(0, 3).map((error) => (
                    <div key={error.questionId} className="text-sm leading-6 text-muted-foreground">
                      <p className="font-semibold text-foreground">
                        {error.selected} {"->"} correto: {error.correctAnswer}
                      </p>
                      <p className="text-muted-foreground">{error.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button onClick={onRestart}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Jogar novamente
              </Button>
              <Button asChild variant="outline">
                <Link href={`/games/${categorySlug}`}>Voltar à categoria</Link>
              </Button>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
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

function getRoundDuration() {
  return 90;
}

function getLiveXpGain(combo: number, difficultyStage: number) {
  return 4 + Math.min(12, combo * 2) + difficultyStage * 2;
}

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
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
