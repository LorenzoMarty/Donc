"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS as DndCss } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, GripVertical, RotateCcw, X } from "lucide-react";

import type { GameCategory, GameCompletion, GameDefinition, OrderRound } from "@/features/gamification/types";
import { SessionHUD } from "@/game-pages/games/components/SessionHUD";
import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game-store";
import { cn } from "@/utils";

type OrderCell = { id: string; correctIndex: number; text: string };

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

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
  const streak = useGameStore((state) => state.streak.current);
  const rounds = useMemo<OrderRound[]>(() => shuffle(game.order?.rounds ?? []), [game.order]);

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

  // Reinicia as células ao trocar de rodada.
  const [trackedStep, setTrackedStep] = useState(step);
  if (trackedStep !== step) {
    setTrackedStep(step);
    setCells(initialCells);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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

  const liveAccuracy = step ? Math.round((score / step) * 100) : 100;

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
        step={Math.min(step + (verdict ? 1 : 0), rounds.length)}
        total={rounds.length}
        seconds={0}
        streak={streak}
        xp={game.xpReward}
      />

      <AnimatePresence mode="wait">
        {!result && round ? (
          <motion.section
            key={round.id}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="game-surface bg-card p-4 md:p-6"
          >
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge variant="secondary">{game.difficulty}</Badge>
              <Badge variant="outline">
                Rodada {step + 1} de {rounds.length}
              </Badge>
            </div>
            <h2 className="text-lg font-semibold leading-7 tracking-normal md:text-xl">{round.instruction}</h2>
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
                      : "border-destructive/25 bg-destructive/10 text-red-800",
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
          <ResultCard result={result} total={rounds.length} onRestart={restart} categorySlug={category.slug} />
        )}
      </AnimatePresence>
    </div>
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
        "flex items-center gap-3 rounded-md border bg-background/70 p-3 text-sm",
        !disabled && "cursor-grab",
        isDragging && "opacity-50 shadow-lg",
        verdict === "correct" && "border-emerald-500/55 bg-emerald-500/10",
        verdict === "wrong" && "border-destructive/55 bg-destructive/10",
      )}
      {...(disabled ? {} : listeners)}
      {...attributes}
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border bg-card text-xs font-semibold">
        {position}
      </span>
      {verdict === "correct" ? (
        <Check className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
      ) : verdict === "wrong" ? (
        <X className="h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
      ) : (
        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      )}
      <span className="leading-6">{cell.text}</span>
    </li>
  );
}

function ResultCard({
  result,
  total,
  onRestart,
  categorySlug,
}: {
  result: GameCompletion | null;
  total: number;
  onRestart: () => void;
  categorySlug: string;
}) {
  return (
    <motion.section
      key="result"
      initial={{ opacity: 0, scale: 0.96, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="game-surface bg-card p-5 text-center md:p-7"
    >
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-md border border-primary/30 bg-primary text-primary-foreground">
        <Check className="h-8 w-8" aria-hidden="true" />
      </div>
      {result?.rankUp && (
        <div className="mx-auto mt-4 w-fit rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Rank up - {result.rankName}
        </div>
      )}
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Sessão concluída</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-normal">{result?.attempt.accuracy ?? 0}% de precisão</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Você ordenou {result?.attempt.score ?? 0} de {total} rodadas e recebeu {result?.xpEarned ?? 0} XP.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button onClick={onRestart} variant="outline">
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Repetir
        </Button>
        <Button asChild>
          <Link href={`/games/${categorySlug}`}>Voltar para categoria</Link>
        </Button>
      </div>
    </motion.section>
  );
}
