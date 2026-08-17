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
import { Check, X } from "lucide-react";

import { selectAdaptivePool } from "@/features/gamification/adaptive";
import type { GameCategory, GameCompletion, GameDefinition, OrderRound } from "@/features/gamification/types";
import { DragHandle } from "@/games/_engines/DragHandle";
import { EngineResult } from "@/games/_engines/EngineResult";
import { shuffle } from "@/games/_engines/shuffleOptions";
import { useDragSensors } from "@/games/_engines/useDragSensors";
import { GameSessionShell } from "@/game-pages/games/components/GameSessionShell";
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
 * Engine `order`: arrastar frases até a sequência correta. Várias rodadas
 * independentes; cada rodada acertada (ordem exata) conta como ponto.
 */
export function OrderSession({ game, category }: { game: GameDefinition; category: GameCategory }) {
  const completeGame = useGameStore((state) => state.completeGame);
  const adaptive = useGameStore((state) => state.adaptive);
  const rounds = useMemo<OrderRound[]>(
    () => selectAdaptivePool(game, game.order?.rounds ?? [], adaptive, shuffle),
    [game, adaptive],
  );

  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [verdict, setVerdict] = useState<"correct" | "wrong" | null>(null);
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

  function check() {
    if (verdict) return;
    const ok = cells.every((cell, index) => cell.correctIndex === index);
    setVerdict(ok ? "correct" : "wrong");
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
    setResult(null);
    setTrackedStep(0);
    setCells(initialCells);
  }

  return (
    <GameSessionShell
      categoryName={category.name}
      categorySlug={category.slug}
      title={game.name}
      step={step + (verdict ? 1 : 0)}
      total={rounds.length}
    >
      <AnimatePresence mode="wait">
        {!result && round ? (
          <motion.section
            key={round.id}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="force-light game-surface bg-card p-4 text-foreground md:p-6"
          >
            <h2 className="font-display text-xl font-semibold leading-7 tracking-normal md:text-2xl">{round.instruction}</h2>
            <p className="mt-2 text-sm text-muted-foreground">Arraste para ordenar de cima para baixo.</p>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={cells.map((cell) => cell.id)} strategy={verticalListSortingStrategy}>
                <ol className="mt-5 space-y-2">
                  {cells.map((cell, index) => (
                    <SortableRow
                      key={cell.id}
                      cell={cell}
                      position={index + 1}
                      disabled={verdict !== null}
                      verdict={verdict ? (cell.correctIndex === index ? "correct" : "wrong") : undefined}
                    />
                  ))}
                </ol>
              </SortableContext>
            </DndContext>

            <AnimatePresence>
              {verdict && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "mt-5 rounded-md border p-4 text-sm leading-6",
                    verdict === "correct"
                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-800"
                      : "border-warning/25 bg-warning/10 text-warning",
                  )}
                >
                  <p className="font-semibold">{verdict === "correct" ? "Sequência correta!" : "Ainda não está na ordem ideal."}</p>
                  <p className="mt-1 text-foreground/80">{round.explanation}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-5">
              {verdict ? (
                <Button onClick={next}>{step < rounds.length - 1 ? "Próxima rodada" : "Finalizar"}</Button>
              ) : (
                <Button onClick={check}>Conferir ordem</Button>
              )}
            </div>
          </motion.section>
        ) : (
          <div className="force-light">
            <EngineResult
              variant="inline"
              result={result}
              headline={`${result?.attempt.accuracy ?? 0}% de precisão`}
              subline={`Você ordenou ${result?.attempt.score ?? 0} de ${rounds.length} rodadas.`}
              onRestart={restart}
              categorySlug={category.slug}
            />
          </div>
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
}: {
  cell: OrderCell;
  position: number;
  disabled?: boolean;
  verdict?: "correct" | "wrong";
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cell.id, disabled });
  const style = { transform: DndCss.Transform.toString(transform), transition };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 rounded-md border bg-background/70 py-1.5 pl-3 pr-1.5 text-sm sm:gap-3",
        isDragging && "opacity-50 shadow-lg",
        verdict === "correct" && "border-emerald-500/55 bg-emerald-500/10",
        verdict === "wrong" && "border-warning/55 bg-warning/10",
      )}
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border bg-card text-xs font-semibold">
        {position}
      </span>
      <span className="min-w-0 flex-1 leading-6">{cell.text}</span>
      {verdict === "correct" ? (
        <Check className="mr-2 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
      ) : verdict === "wrong" ? (
        <X className="mr-2 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
      ) : (
        <DragHandle attributes={attributes} listeners={listeners} disabled={disabled} />
      )}
    </li>
  );
}
