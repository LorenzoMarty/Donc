"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { closestCenter, DndContext, type DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS as DndCss } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, ChevronDown, ChevronUp, GripVertical, Info, ListOrdered, RotateCcw, X } from "lucide-react";

import { selectAdaptivePool } from "@/features/gamification/adaptive";
import type { GameCategory, GameCompletion, GameDefinition, OrderRound } from "@/features/gamification/types";
import { PostSessionFeedback, readReturnTo } from "@/games/_engines/EngineResult";
import { shuffle } from "@/games/_engines/shuffleOptions";
import { useDragSensors } from "@/games/_engines/useDragSensors";
import { GameSessionShell, type SessionPipStatus } from "@/game-pages/games/components/GameSessionShell";
import { Surface } from "@/components/shared/premium-ui";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game-store";
import { cn } from "@/utils";

type OrderCell = { id: string; correctIndex: number; text: string };

/** Garante embaralhamento diferente da ordem correta quando possível. */
function shuffleCells(cells: OrderCell[]): OrderCell[] {
  if (cells.length < 2) return cells;
  let out = shuffle(cells);
  let guard = 0;
  while (out.every((cell, index) => cell.correctIndex === index) && guard < 8) {
    out = shuffle(cells);
    guard += 1;
  }
  return out;
}

/**
 * Engine `order`: arrastar frases (ou usar as setas) até a sequência correta. Várias rodadas
 * independentes; cada rodada acertada (ordem exata) conta como ponto. Visual "Apple-inspired"
 * (spine numerado, pips de progresso, resultado em anel) alinhado ao mock `FluxoParagrafo.dc.html`.
 */
export function OrderSession({ game, category }: { game: GameDefinition; category: GameCategory }) {
  const completeGame = useGameStore((state) => state.completeGame);
  const recordCognitiveOutcome = useGameStore((state) => state.recordCognitiveOutcome);
  const adaptive = useGameStore((state) => state.adaptive);
  const rounds = useMemo<OrderRound[]>(
    () => selectAdaptivePool(game, game.order?.rounds ?? [], adaptive, shuffle),
    [game, adaptive],
  );

  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [verdict, setVerdict] = useState<"correct" | "wrong" | null>(null);
  const [results, setResults] = useState<("correct" | "wrong")[]>([]);
  const [result, setResult] = useState<GameCompletion | null>(null);

  const round = rounds[step];
  const initialCells = useMemo<OrderCell[]>(
    () => (round ? shuffleCells(round.items.map((text, index) => ({ id: `${round.id}-${index}`, correctIndex: index, text }))) : []),
    [round],
  );
  const [cells, setCells] = useState<OrderCell[]>(initialCells);

  // Reinicia as células ao trocar de rodada. setState durante o render (não num efeito) é o
  // padrão recomendado pelo React para resetar estado derivado de uma prop que mudou —
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [trackedStep, setTrackedStep] = useState(step);
  if (trackedStep !== step) {
    setTrackedStep(step);
    setCells(initialCells);
  }

  const sensors = useDragSensors({ keyboardCoordinateGetter: sortableKeyboardCoordinates });

  if (!round && !result) {
    return (
      <Surface className="text-center">
        <h1 className="text-2xl font-semibold">Atividade sem rodadas</h1>
        <Button asChild className="mt-4">
          <Link href={`/games/${category.slug}`}>Voltar à categoria</Link>
        </Button>
      </Surface>
    );
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || verdict) return;
    setCells((prev) => {
      const from = prev.findIndex((cell) => cell.id === active.id);
      const to = prev.findIndex((cell) => cell.id === over.id);
      return arrayMove(prev, from, to);
    });
  }

  function move(index: number, direction: -1 | 1) {
    if (verdict) return;
    const target = index + direction;
    if (target < 0 || target >= cells.length) return;
    setCells((prev) => arrayMove(prev, index, target));
  }

  function check() {
    if (verdict) return;
    const ok = cells.every((cell, index) => cell.correctIndex === index);
    setVerdict(ok ? "correct" : "wrong");
    setResults((prev) => [...prev, ok ? "correct" : "wrong"]);
    recordCognitiveOutcome(game, { correct: ok });
    if (ok) setScore((v) => v + 1);
  }

  function next() {
    const finalScore = score;
    if (step < rounds.length - 1) {
      setStep((v) => v + 1);
      setVerdict(null);
      return;
    }
    const completion = completeGame(game, finalScore, rounds.length, 0);
    setResult(completion);
  }

  function restart() {
    setStep(0);
    setScore(0);
    setVerdict(null);
    setResults([]);
    setResult(null);
    setTrackedStep(0);
    setCells(initialCells);
  }

  const pips: SessionPipStatus[] = rounds.map((_, index) => {
    if (index < results.length) return results[index];
    if (index === step && !result) return "current";
    return "pending";
  });

  return (
    <GameSessionShell
      categoryName={category.name}
      categorySlug={category.slug}
      title={game.name}
      step={step + (verdict ? 1 : 0)}
      total={rounds.length}
      pips={pips}
      extraChips={
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/12 px-3 py-1.5 text-xs font-bold text-primary">
          <Check className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={3} />
          {score}
        </span>
      }
    >
      <AnimatePresence mode="wait">
        {!result && round ? (
          <motion.section
            key={round.id}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="force-light game-surface bg-card p-5 text-foreground md:p-7"
          >
            {/* BRIEF */}
            <div className="flex items-start gap-3.5">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
                <ListOrdered className="h-[18px] w-[18px]" aria-hidden="true" />
              </div>
              <h2 className="font-display min-w-0 text-lg leading-snug tracking-normal text-foreground md:text-xl">
                {round.instruction}
              </h2>
            </div>

            {/* FLUXO */}
            <div className="relative mt-6">
              {verdict && cells.length > 1 && (
                <div
                  className={cn("absolute left-[13px] top-6 bottom-6 w-px rounded-full", verdict === "correct" ? "bg-primary/25" : "bg-border")}
                  aria-hidden="true"
                />
              )}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={cells.map((cell) => cell.id)} strategy={verticalListSortingStrategy}>
                  <ol className="relative flex flex-col gap-2.5">
                    {cells.map((cell, index) => (
                      <SortableRow
                        key={cell.id}
                        cell={cell}
                        position={index + 1}
                        disabled={verdict !== null}
                        verdict={verdict ? (cell.correctIndex === index ? "correct" : "wrong") : undefined}
                        onMoveUp={index > 0 ? () => move(index, -1) : undefined}
                        onMoveDown={index < cells.length - 1 ? () => move(index, 1) : undefined}
                      />
                    ))}
                  </ol>
                </SortableContext>
              </DndContext>
            </div>

            {/* AÇÕES / FEEDBACK */}
            {!verdict ? (
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <Button onClick={check}>Conferir ordem</Button>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Arraste os blocos ou use as setas
                </p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "mt-6 rounded-2xl border p-5",
                  verdict === "correct" ? "border-primary/20 bg-primary/6" : "border-destructive/20 bg-destructive/6",
                )}
              >
                <div className="flex flex-wrap items-start gap-3.5 sm:flex-nowrap">
                  <div
                    className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                      verdict === "correct" ? "bg-primary/15 text-primary" : "bg-destructive/12 text-destructive",
                    )}
                  >
                    {verdict === "correct" ? (
                      <Check className="h-4 w-4" aria-hidden="true" strokeWidth={3} />
                    ) : (
                      <X className="h-4 w-4" aria-hidden="true" strokeWidth={3} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground">
                      {verdict === "correct" ? "Sequência correta." : "A ordem quebra o argumento."}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{round.explanation}</p>
                  </div>
                  <Button onClick={next} className="w-full shrink-0 sm:w-auto">
                    {step < rounds.length - 1 ? "Próxima rodada" : "Ver resultado"}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </motion.div>
            )}
          </motion.section>
        ) : (
          <OrderResult key="result" result={result} rounds={rounds} onRestart={restart} categorySlug={category.slug} />
        )}
      </AnimatePresence>
    </GameSessionShell>
  );
}

function SortableRow({
  cell,
  position,
  disabled,
  verdict,
  onMoveUp,
  onMoveDown,
}: {
  cell: OrderCell;
  position: number;
  disabled?: boolean;
  verdict?: "correct" | "wrong";
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cell.id, disabled });
  const style = { transform: DndCss.Transform.toString(transform), transition };

  return (
    <li ref={setNodeRef} style={style} className={cn("relative flex items-start gap-3", isDragging && "z-10")}>
      {verdict && (
        <span
          className={cn(
            "mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-primary-foreground shadow-[0_0_0_5px_hsl(var(--background))]",
            verdict === "correct" ? "bg-primary" : "bg-destructive",
          )}
        >
          {verdict === "correct" ? (
            <Check className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={3} />
          ) : (
            <X className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={3} />
          )}
        </span>
      )}
      <div
        {...(disabled ? {} : attributes)}
        {...(disabled ? {} : listeners)}
        className={cn(
          "flex flex-1 touch-none items-center gap-3 rounded-2xl border bg-card py-3 pl-3 pr-3 shadow-soft transition-colors",
          !disabled && "cursor-grab active:cursor-grabbing",
          isDragging && "opacity-50 shadow-lg",
          !verdict && "border-border",
          verdict === "correct" && "border-primary/50 shadow-[0_10px_24px_-16px_hsl(var(--primary)/0.8)]",
          verdict === "wrong" && "border-destructive/45",
        )}
      >
        <span className={cn("shrink-0 text-muted-foreground/70", verdict && "hidden")} aria-hidden="true">
          <GripVertical className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-[10.5px] font-bold uppercase tracking-[0.07em]",
              verdict === "correct" ? "text-primary" : verdict === "wrong" ? "text-destructive" : "text-muted-foreground",
            )}
          >
            Etapa {position}
          </p>
          <p className="font-display mt-1 text-[15px] leading-[1.45] tracking-normal text-foreground md:text-base">{cell.text}</p>
        </div>
        {!verdict && (
          <div className="flex shrink-0 flex-col gap-1">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={!onMoveUp}
              title="Mover para cima"
              aria-label="Mover bloco para cima"
              className="grid h-11 w-11 place-items-center rounded-control text-muted-foreground transition-colors enabled:hover:bg-muted enabled:hover:text-foreground disabled:opacity-30"
            >
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={!onMoveDown}
              title="Mover para baixo"
              aria-label="Mover bloco para baixo"
              className="grid h-11 w-11 place-items-center rounded-control text-muted-foreground transition-colors enabled:hover:bg-muted enabled:hover:text-foreground disabled:opacity-30"
            >
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

function OrderResult({
  result,
  rounds,
  onRestart,
  categorySlug,
}: {
  result: GameCompletion | null;
  rounds: OrderRound[];
  onRestart: () => void;
  categorySlug: string;
}) {
  const returnTo = readReturnTo();
  if (!result) return null;

  const pct = result.attempt.accuracy;
  const circumference = 2 * Math.PI * 42;
  const dash = (circumference * pct) / 100;
  const verdict = pct >= 100 ? "Sequenciamento dominado" : pct >= 50 ? "No caminho certo" : "Vale revisar";
  const verdictSub =
    pct >= 100
      ? "Você monta a progressão textual com clareza — isso sustenta a coesão do texto."
      : pct >= 50
        ? "Você acerta o essencial, mas ainda troca a ordem de alguns elementos."
        : "Reveja os conectivos e retomadas que amarram a sequência, e tente de novo.";

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.96, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="force-light game-surface mx-auto max-w-xl bg-card p-6 text-center text-foreground md:p-8"
    >
      <div className="relative mx-auto h-24 w-24">
        <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
          <circle cx="48" cy="48" r="42" fill="none" stroke="hsl(var(--muted-foreground) / 0.16)" strokeWidth="8" />
          <circle
            cx="48"
            cy="48"
            r="42"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="8"
            strokeLinecap={pct === 0 ? "butt" : "round"}
            strokeDasharray={`${dash.toFixed(1)} ${circumference.toFixed(1)}`}
          />
        </svg>
        <div className="font-display absolute inset-0 grid place-items-center text-2xl font-medium text-foreground">{pct}%</div>
      </div>

      <h2 className="font-display mt-5 text-2xl font-medium tracking-normal text-foreground">{verdict}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{verdictSub}</p>

      <div className="mt-6 rounded-2xl bg-muted/60 p-5 text-left">
        <p className="text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">Por trás de cada sequência</p>
        <div className="mt-3 space-y-2.5">
          {rounds.map((round, index) => (
            <div key={round.id} className="flex items-start gap-2.5">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                {index + 1}
              </span>
              <span className="text-sm leading-6 text-foreground/85">{round.explanation}</span>
            </div>
          ))}
        </div>
      </div>

      <PostSessionFeedback />

      <div className="mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
        <Button onClick={onRestart}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Jogar de novo
        </Button>
        <Button asChild variant="outline">
          <Link href={returnTo ?? `/games/${categorySlug}`}>{returnTo ? "Próximo exercício" : "Voltar ao hub"}</Link>
        </Button>
      </div>
    </motion.section>
  );
}
