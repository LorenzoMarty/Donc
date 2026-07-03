"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, RotateCcw, XCircle } from "lucide-react";

import { getCategoryBySlug, getGameById } from "@/features/gamification/catalog";
import { masteryForHub, selectItemsBySkill } from "@/features/gamification/adaptive";
import { EssayAssemblySession } from "@/games/structure/EssayAssemblySession";
import { TimedRushSession } from "@/games/_engines/TimedRushSession";
import { ClassifyDragSession } from "@/games/_engines/ClassifyDragSession";
import { OrderSession } from "@/games/_engines/OrderSession";
import { FillBlankSession } from "@/games/_engines/FillBlankSession";
import { DuelSession } from "@/games/_engines/DuelSession";
import { ArgumentEscalationSession } from "@/games/_engines/ArgumentEscalationSession";
import { ArtificialitySession } from "@/games/_engines/ArtificialitySession";
import { CorrectorSession } from "@/games/_engines/CorrectorSession";
import { EssayCollapseSession } from "@/games/_engines/EssayCollapseSession";
import { SurvivalSession } from "@/games/_engines/SurvivalSession";
import { TextSurgerySession } from "@/games/_engines/TextSurgerySession";
import { shuffleQuestionOptions } from "@/games/_engines/shuffleOptions";
import { SessionHUD } from "@/game-pages/games/components/SessionHUD";
import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game-store";
import { useTrackEvent } from "@/hooks/use-track-event";
import { cn } from "@/utils";

function useReturnTo(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return new URLSearchParams(window.location.search).get("returnTo") ?? undefined;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function GameSession({ categorySlug, gameId }: { categorySlug: string; gameId: string }) {
  const returnTo = useReturnTo();
  const completeGame = useGameStore((state) => state.completeGame);
  const streak = useGameStore((state) => state.streak.current);
  const adaptive = useGameStore((state) => state.adaptive);
  const remoteGames = useGameStore((state) => state.remoteGames);
  const remoteGamesHydrated = useGameStore((state) => state.remoteGamesHydrated);
  const hydrateRemoteGames = useGameStore((state) => state.hydrateRemoteGames);
  const trackEvent = useTrackEvent();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [result, setResult] = useState<ReturnType<typeof completeGame> | null>(null);
  const [seconds, setSeconds] = useState(0);

  const game = getGameById(gameId, remoteGames);
  const category = getCategoryBySlug(categorySlug);

  // Questoes selecionadas por dificuldade compativel com a maestria do aluno no hub (quando ha
  // sinal); sem sinal, cai no sorteio puro de sempre.
  const questions = useMemo(() => {
    if (!game?.questions) return [];
    const hub = game.hubs?.[0];
    const hasSignal = hub ? (adaptive.weaknessSignals[hub] ?? 0) > 0 || masteryForHub(adaptive, hub) > 0 : false;
    const ordered = hasSignal
      ? selectItemsBySkill(game.questions, masteryForHub(adaptive, hub!), game.questions.length)
      : shuffle(game.questions);
    return ordered.map(shuffleQuestionOptions);
  }, [game, adaptive]);

  useEffect(() => {
    hydrateRemoteGames();
  }, [hydrateRemoteGames]);

  useEffect(() => {
    if (result) return;
    const id = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [result]);

  useEffect(() => {
    if (game) trackEvent({ event_type: "game_started", entity_id: game.id, entity_type: "game" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.id]);

  const question = questions[step];
  const score = answers.filter(Boolean).length;
  const liveAccuracy = answers.length ? Math.round((score / answers.length) * 100) : 100;

  // Jogo dinamico (ai-*) pode nao ter carregado ainda.
  if (!game && !remoteGamesHydrated) {
    return (
      <Surface className="text-center">
        <h1 className="text-2xl font-semibold">Carregando jogo...</h1>
      </Surface>
    );
  }

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

  // Roteamento por engine: cada engine interativo tem seu próprio componente.
  if (game.engine === "timed-rush") {
    return <TimedRushSession game={game} category={category} />;
  }
  if (game.engine === "classify") {
    return <ClassifyDragSession game={game} category={category} />;
  }
  if (game.engine === "order") {
    return <OrderSession game={game} category={category} />;
  }
  if (game.engine === "fill-blank") {
    return <FillBlankSession game={game} category={category} />;
  }
  if (game.engine === "sequence") {
    return <EssayAssemblySession game={game} category={category} />;
  }
  if (game.engine === "duel") {
    return <DuelSession game={game} category={category} />;
  }
  if (game.engine === "argument-escalation") {
    return <ArgumentEscalationSession game={game} category={category} />;
  }
  if (game.engine === "artificiality") {
    return <ArtificialitySession game={game} category={category} />;
  }
  if (game.engine === "corrector") {
    return <CorrectorSession game={game} category={category} />;
  }
  if (game.engine === "essay-collapse") {
    return <EssayCollapseSession game={game} category={category} />;
  }
  if (game.engine === "survival") {
    return <SurvivalSession game={game} category={category} />;
  }
  if (game.engine === "text-surgery") {
    return <TextSurgerySession game={game} category={category} />;
  }
  // engine "quiz" e "choice" usam o render inline abaixo.

  function answer(index: number) {
    if (!question || selected !== null || result || !game) return;
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
      const completion = completeGame(game, nextAnswers.filter(Boolean).length, questions.length, seconds);
      setResult(completion);
      trackEvent({ event_type: "game_completed", entity_id: game.id, entity_type: "game", duration_ms: seconds * 1000, meta: { accuracy: completion.attempt.accuracy, xp_earned: completion.xpEarned } });
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
            <Link href={returnTo ?? `/games/${category.slug}`}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {returnTo ? "Treino" : "Categoria"}
            </Link>
          </Button>
        }
      />

      <SessionHUD
        accuracy={liveAccuracy}
        step={Math.min(step + 1, questions.length)}
        total={questions.length}
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
                  Questao {step + 1} de {questions.length}
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
                        animate={
                          isWrong
                            ? { x: [-5, 5, -4, 4, -2, 2, 0] }
                            : isCorrect
                              ? { scale: [1, 1.05, 0.97, 1] }
                              : { x: 0, scale: 1 }
                        }
                        transition={{ duration: 0.38, ease: "easeOut" }}
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
                            <CheckCircle2 className="h-5 w-5 text-primary" />
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
                <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <Button onClick={restart} variant="outline">
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Repetir
                  </Button>
                  <Button asChild>
                    <Link href={returnTo ?? `/games/${category.slug}`}>
                      {returnTo ? "Próximo exercício" : "Voltar para categoria"}
                    </Link>
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
