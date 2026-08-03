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
import { Check, GripVertical, X } from "lucide-react";

import { selectAdaptivePool } from "@/features/gamification/adaptive";
import type { ClassifyItem, GameCategory, GameCompletion, GameDefinition } from "@/features/gamification/types";
import { EngineResult } from "@/games/_engines/EngineResult";
import { shuffle } from "@/games/_engines/shuffleOptions";
import { GameSessionShell } from "@/game-pages/games/components/GameSessionShell";
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
  const placedCount = useMemo(() => items.filter((item) => placement[item.id] !== "bank").length, [items, placement]);
  const allPlaced = placedCount === items.length && items.length > 0;
  const correctCount = useMemo(() => items.filter((item) => placement[item.id] === item.bucketId).length, [items, placement]);
  const wrongItems = useMemo(() => items.filter((item) => placement[item.id] !== item.bucketId), [items, placement]);
  const bankItems = useMemo(() => items.filter((item) => placement[item.id] === "bank"), [items, placement]);

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

  return (
    <GameSessionShell
      categoryName={category.name}
      categorySlug={category.slug}
      title={game.name}
      step={placedCount}
      total={items.length}
      xp={game.xpReward}
    >
      <div className="force-light space-y-5 md:space-y-6">
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

      <EngineResult
        result={result}
        eyebrow="Classificação conferida"
        headline={`${result?.attempt.accuracy ?? 0}% de acerto`}
        subline={`${result?.attempt.score ?? 0} de ${items.length} no balde certo.`}
        review={wrongItems.map((item) => ({
          id: item.id,
          text: item.explanation ? `${item.text} — ${item.explanation}` : item.text,
        }))}
        onRestart={restart}
        categorySlug={category.slug}
      />
      </div>
    </GameSessionShell>
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
