"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS as DndCss } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, GripVertical, RotateCcw, Trophy, X } from "lucide-react";

import { selectAdaptivePool } from "@/features/gamification/adaptive";
import type { ClassifyItem, GameCategory, GameCompletion, GameDefinition } from "@/features/gamification/types";
import { shuffle } from "@/games/_engines/shuffleOptions";
import { SessionHUD } from "@/game-pages/games/components/SessionHUD";
import { PageHeader } from "@/components/shared/premium-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game-store";
import { cn } from "@/utils";

type Placement = Record<string, string>; // itemId -> "bank" | bucketId

/**
 * Engine `classify`: arrastar cada item para o balde correto. Conferir revela
 * acertos/erros e registra a tentativa. Reordenar e tentar de novo é incentivado.
 */
export function ClassifyDragSession({ game, category }: { game: GameDefinition; category: GameCategory }) {
  const completeGame = useGameStore((state) => state.completeGame);
  const streak = useGameStore((state) => state.streak.current);
  const adaptive = useGameStore((state) => state.adaptive);
  const payload = game.classify;
  const items = useMemo(
    () => selectAdaptivePool(game, payload?.items ?? [], adaptive, shuffle),
    [payload, game, adaptive],
  );
  const buckets = payload?.buckets ?? [];

  const [placement, setPlacement] = useState<Placement>(() => Object.fromEntries(items.map((item) => [item.id, "bank"])));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [result, setResult] = useState<GameCompletion | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const itemMap = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const placedCount = items.filter((item) => placement[item.id] !== "bank").length;
  const allPlaced = placedCount === items.length && items.length > 0;
  const correctCount = items.filter((item) => placement[item.id] === item.bucketId).length;
  const liveAccuracy = items.length ? Math.round((correctCount / items.length) * 100) : 0;

  if (!payload || items.length === 0) {
    return (
      <section className="game-surface bg-card p-6 text-center">
        <h1 className="text-2xl font-semibold">Atividade sem itens</h1>
        <Button asChild className="mt-4">
          <Link href={`/games/${category.slug}`}>Voltar à categoria</Link>
        </Button>
      </section>
    );
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || checked) return;
    setPlacement((prev) => ({ ...prev, [String(active.id)]: String(over.id) }));
  }

  function check() {
    if (!allPlaced || checked) return;
    setChecked(true);
    const completion = completeGame(game, correctCount, items.length, 0);
    setResult(completion);
  }

  function restart() {
    setPlacement(Object.fromEntries(items.map((item) => [item.id, "bank"])));
    setChecked(false);
    setResult(null);
  }

  const bankItems = items.filter((item) => placement[item.id] === "bank");

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
        accuracy={checked ? liveAccuracy : 100}
        step={placedCount}
        total={items.length}
        seconds={0}
        streak={streak}
        xp={game.xpReward}
      />

      <div className="game-tile bg-primary/5 p-4 text-sm leading-6 text-foreground/80">{payload.instruction}</div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(event: DragStartEvent) => setActiveId(String(event.active.id))}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <Bank id="bank">
          {bankItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todos os itens foram distribuídos.</p>
          ) : (
            bankItems.map((item) => <DraggableChip key={item.id} item={item} disabled={checked} />)
          )}
        </Bank>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {buckets.map((bucket) => {
            const bucketItems = items.filter((item) => placement[item.id] === bucket.id);
            return (
              <BucketZone key={bucket.id} id={bucket.id} label={bucket.label} hint={bucket.hint} count={bucketItems.length}>
                {bucketItems.map((item) => (
                  <DraggableChip
                    key={item.id}
                    item={item}
                    disabled={checked}
                    verdict={checked ? (placement[item.id] === item.bucketId ? "correct" : "wrong") : undefined}
                  />
                ))}
              </BucketZone>
            );
          })}
        </div>

        <DragOverlay>
          {activeId ? <ChipBody text={itemMap.get(activeId)?.text ?? ""} dragging /> : null}
        </DragOverlay>
      </DndContext>

      {!checked && (
        <Button onClick={check} disabled={!allPlaced} className="w-full sm:w-auto">
          Conferir classificação
        </Button>
      )}

      <ResultModal
        result={result}
        total={items.length}
        items={items}
        placement={placement}
        onRestart={restart}
        categorySlug={category.slug}
      />
    </div>
  );
}

function Bank({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section
      ref={setNodeRef}
      className={cn(
        "game-surface flex min-h-20 flex-wrap gap-2 bg-card p-4 transition-colors",
        isOver && "border-primary/60 bg-primary/5",
      )}
    >
      <p className="w-full text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Banco de itens</p>
      {children}
    </section>
  );
}

function BucketZone({
  id,
  label,
  hint,
  count,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section
      ref={setNodeRef}
      className={cn(
        "game-surface flex min-h-36 flex-col gap-2 bg-card p-4 transition-colors",
        isOver && "border-primary/60 bg-primary/5",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-normal text-foreground">{label}</h3>
        <Badge variant="outline">{count}</Badge>
      </div>
      {hint && <p className="text-xs leading-5 text-muted-foreground">{hint}</p>}
      <div className="mt-1 flex flex-1 flex-wrap content-start gap-2">{children}</div>
    </section>
  );
}

function DraggableChip({ item, disabled, verdict }: { item: ClassifyItem; disabled?: boolean; verdict?: "correct" | "wrong" }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id, disabled });
  const style = transform ? { transform: DndCss.Translate.toString(transform) } : undefined;
  return (
    <button
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      type="button"
      className={cn(
        "flex max-w-full items-center gap-1.5 rounded-md border bg-background/70 px-3 py-2 text-left text-sm font-medium transition-colors",
        !disabled && "cursor-grab hover:border-primary/50 hover:bg-primary/5",
        isDragging && "opacity-40",
        verdict === "correct" && "border-emerald-500/60 bg-emerald-500/10 text-emerald-800",
        verdict === "wrong" && "border-destructive/60 bg-destructive/10 text-red-800",
      )}
    >
      {verdict === "correct" ? (
        <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : verdict === "wrong" ? (
        <X className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      )}
      <span className="leading-5">{item.text}</span>
    </button>
  );
}

function ChipBody({ text, dragging }: { text: string; dragging?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md border bg-card px-3 py-2 text-sm font-medium shadow-lg",
        dragging && "border-primary/60",
      )}
    >
      <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="leading-5">{text}</span>
    </div>
  );
}

function ResultModal({
  result,
  total,
  items,
  placement,
  onRestart,
  categorySlug,
}: {
  result: GameCompletion | null;
  total: number;
  items: ClassifyItem[];
  placement: Placement;
  onRestart: () => void;
  categorySlug: string;
}) {
  const wrong = items.filter((item) => placement[item.id] !== item.bucketId);
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
            <div className="text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-md border border-primary/30 bg-primary text-primary-foreground">
                <Trophy className="h-8 w-8" aria-hidden="true" />
              </div>
              {result.rankUp && (
                <div className="mx-auto mt-4 w-fit rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  Rank up - {result.rankName}
                </div>
              )}
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Classificação conferida</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-normal">{result.attempt.accuracy}% de acerto</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {result.attempt.score} de {total} no balde certo · +{result.xpEarned} XP
              </p>
            </div>

            {wrong.length > 0 && (
              <div className="game-tile mt-5 border-destructive/20 bg-destructive/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-700">Itens para revisar</p>
                <div className="mt-3 space-y-2">
                  {wrong.map((item) => (
                    <p key={item.id} className="text-sm leading-6 text-muted-foreground">
                      <span className="font-semibold text-foreground">{item.text}</span>
                      {item.explanation ? ` — ${item.explanation}` : ""}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button onClick={onRestart}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Tentar de novo
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
