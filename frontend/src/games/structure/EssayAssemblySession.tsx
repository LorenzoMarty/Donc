"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
  useDroppable,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS as DndCss } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ChevronDown, ChevronUp, Clock, GripVertical, RotateCcw, Trophy, X } from "lucide-react";

import type { GameCategory, GameCompletion, GameDefinition } from "@/features/gamification/types";
import { useDragSensors } from "@/games/_engines/useDragSensors";
import { GameSessionShell, Chip } from "@/game-pages/games/components/GameSessionShell";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game-store";
import { cn, formatMMSS } from "@/utils";

type SectionId = "intro" | "development" | "conclusion";
type ContainerId = "bank" | SectionId;
type BoardState = Record<ContainerId, string[]>;

type EssayBlock = {
  id: string;
  text: string;
  expectedSection?: SectionId;
  order: number;
  distractor?: boolean;
};

type AssemblyLevel = {
  title: string;
  description: string;
  blocks: EssayBlock[];
};

type SectionDef = { id: SectionId; n: number; title: string; hint: string };

const containerIds: ContainerId[] = ["bank", "intro", "development", "conclusion"];

const sectionDefs: SectionDef[] = [
  { id: "intro", n: 1, title: "Introdução", hint: "Contextualização e tese" },
  { id: "development", n: 2, title: "Desenvolvimento", hint: "Argumentos, provas e progressão" },
  { id: "conclusion", n: 3, title: "Conclusão", hint: "Retomada e intervenção" },
];

export function EssayAssemblySession({ game, category }: { game: GameDefinition; category: GameCategory }) {
  const completeGame = useGameStore((state) => state.completeGame);
  const recordCognitiveOutcome = useGameStore((state) => state.recordCognitiveOutcome);
  const level = essayLevel;
  const [board, setBoard] = useState<BoardState>(() => createInitialBoard());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checkedValidation, setCheckedValidation] = useState<ValidationResult | null>(null);
  const [triesCount, setTriesCount] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState<GameCompletion | null>(null);
  const [finalValidation, setFinalValidation] = useState<ValidationResult | null>(null);

  const sensors = useDragSensors({ keyboardCoordinateGetter: sortableKeyboardCoordinates });

  const blockMap = useMemo(() => new Map(level.blocks.map((block) => [block.id, block])), [level.blocks]);
  const expectedCounts = useMemo(() => {
    const counts = { intro: 0, development: 0, conclusion: 0 } as Record<SectionId, number>;
    level.blocks.forEach((block) => {
      if (block.expectedSection && !block.distractor) counts[block.expectedSection] += 1;
    });
    return counts;
  }, [level.blocks]);
  const activeBlock = activeId ? blockMap.get(activeId) : undefined;

  useEffect(() => {
    if (result) return;
    const start = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(start);
  }, [result]);

  function findContainer(id: UniqueIdentifier, snapshot: BoardState = board): ContainerId | null {
    const normalized = String(id);
    if (containerIds.includes(normalized as ContainerId)) return normalized as ContainerId;
    return containerIds.find((container) => snapshot[container].includes(normalized)) ?? null;
  }

  function moveBlockToContainer(id: string, target: ContainerId) {
    setBoard((current) => {
      const source = containerIds.find((container) => current[container].includes(id));
      if (!source || source === target) return current;
      return {
        ...current,
        [source]: current[source].filter((item) => item !== id),
        [target]: [...current[target], id],
      };
    });
    setCheckedValidation(null);
  }

  function toggleSelect(id: string) {
    setSelectedId((current) => (current === id ? null : id));
  }

  function placeSelected(sectionId: SectionId) {
    if (!selectedId) return;
    moveBlockToContainer(selectedId, sectionId);
    setSelectedId(null);
  }

  function unplace(id: string) {
    moveBlockToContainer(id, "bank");
  }

  function moveBlock(sectionId: SectionId, index: number, direction: -1 | 1) {
    setBoard((current) => {
      const items = [...current[sectionId]];
      const next = index + direction;
      if (next < 0 || next >= items.length) return current;
      [items[index], items[next]] = [items[next], items[index]];
      return { ...current, [sectionId]: items };
    });
    setCheckedValidation(null);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
    setSelectedId(null);
    setCheckedValidation(null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id);
    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setBoard((current) => {
      const activeId = String(active.id);
      const overId = String(over.id);
      const activeItems = current[activeContainer];
      const overItems = current[overContainer];
      const activeIndex = activeItems.indexOf(activeId);
      const overIndex = overItems.indexOf(overId);
      if (activeIndex < 0 || overItems.includes(activeId)) {
        return current;
      }
      const insertIndex = containerIds.includes(overId as ContainerId) || overIndex < 0 ? overItems.length : overIndex;

      return {
        ...current,
        [activeContainer]: activeItems.filter((item) => item !== activeId),
        [overContainer]: [...overItems.slice(0, insertIndex), activeId, ...overItems.slice(insertIndex)],
      };
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) {
      setActiveId(null);
      return;
    }

    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id);
    if (!activeContainer || !overContainer) {
      setActiveId(null);
      return;
    }

    setBoard((current) => {
      const activeId = String(active.id);
      const overId = String(over.id);
      if (activeContainer !== overContainer) {
        return current;
      }
      const items = current[activeContainer];
      const oldIndex = items.indexOf(activeId);
      const newIndex = items.indexOf(overId);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
        return current;
      }
      return { ...current, [activeContainer]: arrayMove(items, oldIndex, newIndex) };
    });
    setActiveId(null);
  }

  function validate() {
    const nextValidation = evaluateBoard(board, level);
    setCheckedValidation(nextValidation);
    setTriesCount((value) => value + 1);
    recordCognitiveOutcome(game, { correct: nextValidation.isPerfect });
    if (nextValidation.isPerfect) {
      window.setTimeout(() => finish(nextValidation), 420);
    }
  }

  function finish(snapshot: ValidationResult) {
    if (result) return;
    const completion = completeGame(game, snapshot.correct, snapshot.total, seconds);
    setFinalValidation(snapshot);
    setResult(completion);
  }

  function resetBoard() {
    const nextBoard = createInitialBoard();
    setBoard(nextBoard);
    setSelectedId(null);
    setCheckedValidation(null);
    setTriesCount(0);
    setSeconds(0);
    setResult(null);
    setFinalValidation(null);
    setActiveId(null);
  }

  const totalExpected = level.blocks.filter((block) => !block.distractor).length;
  const placedCount = board.intro.length + board.development.length + board.conclusion.length;
  const allPlaced = board.bank.length === 0;
  const currentValidation = finalValidation ?? checkedValidation ?? evaluateBoard(board, level);

  let statusText: string;
  let statusTone: "muted" | "warning" | "primary" = "muted";
  if (checkedValidation && !checkedValidation.isPerfect) {
    statusText = `${checkedValidation.correct} de ${checkedValidation.total} blocos na posição certa — ajuste e valide de novo.`;
    statusTone = "warning";
  } else if (!allPlaced) {
    statusText = `Faltam ${board.bank.length} bloco${board.bank.length === 1 ? "" : "s"} para posicionar.`;
  } else {
    statusText = "Tudo posicionado — valide sua estrutura.";
    statusTone = "primary";
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
    <GameSessionShell
      categoryName={category.name}
      categorySlug={category.slug}
      title={game.name}
      step={Math.min(placedCount, totalExpected)}
      total={totalExpected}
      extraChips={
        <Chip>
          <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {formatMMSS(seconds)}
        </Chip>
      }
    >
      <div className="force-light contents">
        <div className="relative -mx-4 -mb-4 overflow-hidden rounded-b-lg bg-background p-[24px] md:-mx-8 md:-mb-6 md:p-[40px]">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{level.title}</p>
            <h2 className="mt-2 font-display text-3xl font-semibold leading-tight tracking-normal text-foreground md:text-4xl">
              Organize a estrutura da redação
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{level.description}</p>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(15rem,0.75fr)_minmax(0,1.25fr)]">
              <PoolPanel
                items={board.bank}
                blockMap={blockMap}
                selectedId={selectedId}
                onSelect={toggleSelect}
                hasSelection={selectedId !== null}
                onQuickSend={placeSelected}
              />
              <div className="grid gap-3">
                {sectionDefs.map((section) => (
                  <SectionPanel
                    key={section.id}
                    def={section}
                    items={board[section.id]}
                    expectedCount={expectedCounts[section.id]}
                    blockMap={blockMap}
                    validation={checkedValidation}
                    onMove={moveBlock}
                    onRemove={unplace}
                  />
                ))}
              </div>
            </div>

            <DragOverlay>{activeBlock ? <PoolBlockCard block={activeBlock} active /> : null}</DragOverlay>
          </DndContext>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button onClick={validate} disabled={!allPlaced || result !== null}>
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Validar estrutura
            </Button>
            <Button onClick={resetBoard} variant="outline">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reiniciar
            </Button>
            <div className="flex-1" />
            <p
              className={cn(
                "text-sm font-semibold",
                statusTone === "warning" ? "text-warning" : statusTone === "primary" ? "text-primary" : "text-muted-foreground",
              )}
            >
              {statusText}
            </p>
          </div>
        </div>

        <ResultModal
          result={result}
          validation={currentValidation}
          seconds={seconds}
          tries={triesCount}
          categorySlug={category.slug}
          onRestart={resetBoard}
        />
      </div>
    </GameSessionShell>
    </div>
  );
}

function PoolPanel({
  items,
  blockMap,
  selectedId,
  onSelect,
  hasSelection,
  onQuickSend,
}: {
  items: string[];
  blockMap: Map<string, EssayBlock>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  hasSelection: boolean;
  onQuickSend: (sectionId: SectionId) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "bank" });

  return (
    <section
      ref={setNodeRef}
      className={cn("game-tile flex min-h-52 flex-col bg-card p-3 transition-all duration-200", isOver && "border-primary/55 bg-primary/10")}
    >
      <div className="mb-1 flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Frases embaralhadas</p>
        <span className="game-chip bg-card px-2.5 py-1 text-xs font-semibold text-muted-foreground">{items.length}</span>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">Clique num bloco e escolha a seção — ou arraste</p>

      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-2">
          <AnimatePresence initial={false}>
            {items.map((item) => {
              const block = blockMap.get(item);
              if (!block) return null;
              return <SortablePoolBlock key={item} block={block} selected={selectedId === item} onSelect={onSelect} />;
            })}
          </AnimatePresence>
          {items.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="game-tile grid min-h-28 place-items-center border-dashed bg-card/50 px-4 text-center text-sm leading-6 text-muted-foreground"
            >
              Todos os blocos foram posicionados. Valide sua estrutura!
            </motion.div>
          )}
        </div>
      </SortableContext>

      {hasSelection && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-2 text-xs text-muted-foreground">Enviar bloco selecionado para:</p>
          <div className="flex gap-2">
            {sectionDefs.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => onQuickSend(section.id)}
                className="min-h-9 flex-1 rounded-md border border-primary/25 bg-primary/10 px-2 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/15"
              >
                {section.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function SortablePoolBlock({ block, selected, onSelect }: { block: EssayBlock; selected: boolean; onSelect: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  return (
    <PoolBlockCard
      block={block}
      selected={selected}
      onSelect={onSelect}
      refCallback={setNodeRef}
      attributes={attributes}
      listeners={listeners}
      style={{ transform: DndCss.Transform.toString(transform), transition }}
      dragging={isDragging}
    />
  );
}

function PoolBlockCard({
  block,
  active,
  selected,
  dragging,
  onSelect,
  refCallback,
  attributes,
  listeners,
  style,
}: {
  block: EssayBlock;
  active?: boolean;
  selected?: boolean;
  dragging?: boolean;
  onSelect?: (id: string) => void;
  refCallback?: (node: HTMLElement | null) => void;
  attributes?: DraggableAttributes;
  listeners?: DraggableSyntheticListeners;
  style?: React.CSSProperties;
}) {
  return (
    <motion.article
      ref={refCallback}
      layout
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: dragging ? 0.35 : 1, y: 0, scale: active ? 1.03 : 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      style={style}
      onClick={onSelect ? () => onSelect(block.id) : undefined}
      {...attributes}
      {...listeners}
      className={cn(
        "group game-tile flex touch-none items-start gap-2.5 border-border bg-[#fffdf8] p-2.5 text-sm leading-6 text-foreground shadow-soft transition-colors",
        listeners && "cursor-grab active:cursor-grabbing",
        active && "border-primary/45 shadow-lg",
        selected && "border-primary bg-primary/10",
        block.distractor && !selected && "bg-muted text-muted-foreground",
      )}
    >
      <GripVertical className={cn("mt-0.5 h-4 w-4 shrink-0", selected ? "text-primary" : "text-border")} aria-hidden="true" />
      <div className="min-w-0 py-0.5">
        <p>{block.text}</p>
        {block.distractor && <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Distrator</p>}
      </div>
    </motion.article>
  );
}

function SectionPanel({
  def,
  items,
  expectedCount,
  blockMap,
  validation,
  onMove,
  onRemove,
}: {
  def: SectionDef;
  items: string[];
  expectedCount: number;
  blockMap: Map<string, EssayBlock>;
  validation: ValidationResult | null;
  onMove: (sectionId: SectionId, index: number, direction: -1 | 1) => void;
  onRemove: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: def.id });
  const checkedStatus = validation?.sectionStatus[def.id];
  const message = validation?.sectionMessage[def.id];

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "game-tile bg-card p-3 transition-all duration-200",
        isOver && "border-primary/55 bg-primary/10",
        checkedStatus === "correct" && "border-primary/35",
        checkedStatus === "wrong" && "border-destructive/35",
      )}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <div className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-md bg-primary/12 text-xs font-bold text-primary">{def.n}</div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">{def.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{def.hint}</p>
        </div>
        <span
          className={cn(
            "game-chip px-2.5 py-1 text-xs font-semibold",
            checkedStatus === "correct"
              ? "bg-primary/12 text-primary"
              : checkedStatus === "wrong"
                ? "bg-destructive/12 text-destructive"
                : "bg-muted text-muted-foreground",
          )}
        >
          {items.length}/{expectedCount}
        </span>
      </div>

      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="min-h-[4.6rem]">
          <AnimatePresence initial={false}>
            {items.map((item, index) => {
              const block = blockMap.get(item);
              if (!block) return null;
              const ok = validation?.blockCorrectness[item];
              return (
                <SortablePlacedBlock
                  key={item}
                  block={block}
                  ok={ok}
                  onMoveUp={() => onMove(def.id, index, -1)}
                  onMoveDown={() => onMove(def.id, index, 1)}
                  onRemove={() => onRemove(item)}
                  canMoveUp={index > 0}
                  canMoveDown={index < items.length - 1}
                />
              );
            })}
          </AnimatePresence>
          {items.length === 0 && (
            <div className="grid min-h-[4.6rem] place-items-center rounded-md border border-dashed border-border bg-muted/40 px-4 text-center text-sm text-muted-foreground">
              Solte blocos aqui
            </div>
          )}
        </div>
      </SortableContext>

      {message && (
        <p className={cn("mt-2.5 text-xs font-semibold", validation?.sectionStatus[def.id] === "correct" ? "text-primary" : "text-warning")}>
          {message}
        </p>
      )}
    </section>
  );
}

function SortablePlacedBlock({
  block,
  ok,
  onMoveUp,
  onMoveDown,
  onRemove,
  canMoveUp,
  canMoveDown,
}: {
  block: EssayBlock;
  ok?: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });

  return (
    <motion.div
      ref={setNodeRef}
      layout
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: isDragging ? 0.35 : 1, y: 0, scale: 1, x: ok === false ? [0, -5, 5, -3, 3, 0] : 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: ok === false ? 0.34 : 0.2 }}
      style={{ transform: DndCss.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={cn(
        "mb-2 flex touch-none cursor-grab items-start gap-2.5 rounded-md border p-2.5 text-sm leading-6 text-foreground shadow-soft transition-colors active:cursor-grabbing",
        ok === true && "border-primary/35 bg-primary/10",
        ok === false && "border-destructive/35 bg-destructive/10",
        ok === undefined && "border-border bg-[#fffdf8]",
      )}
    >
      <div className="flex shrink-0 flex-col gap-0.5">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={!canMoveUp}
          aria-label="Subir"
          className="grid h-5 w-5 place-items-center rounded bg-muted text-muted-foreground disabled:opacity-30"
        >
          <ChevronUp className="h-3 w-3" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={!canMoveDown}
          aria-label="Descer"
          className="grid h-5 w-5 place-items-center rounded bg-muted text-muted-foreground disabled:opacity-30"
        >
          <ChevronDown className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>
      <p className="min-w-0 flex-1 py-0.5">{block.text}</p>
      {ok !== undefined && (
        <span
          className={cn(
            "grid h-5 w-5 shrink-0 place-items-center rounded-full text-[0.6rem] font-bold",
            ok ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground",
          )}
        >
          {ok ? "✓" : "✕"}
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Devolver ao banco"
        className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded text-border transition-colors hover:text-muted-foreground"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </motion.div>
  );
}

function SideMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-primary-foreground/10 p-3">
      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-primary-foreground/60">{label}</p>
      <p className="mt-1 text-lg font-semibold text-primary-foreground">{value}</p>
    </div>
  );
}

function ResultModal({
  result,
  validation,
  seconds,
  tries,
  categorySlug,
  onRestart,
}: {
  result: GameCompletion | null;
  validation: ValidationResult;
  seconds: number;
  tries: number;
  categorySlug: string;
  onRestart: () => void;
}) {
  const efficiency = tries > 0 ? Math.round(100 / tries) : 100;

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
            initial={{ opacity: 0, y: 16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            className="relative w-full max-w-md rounded-2xl bg-primary p-6 text-center text-primary-foreground shadow-elevated"
          >
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-md bg-primary-foreground/12">
              <Trophy className="h-8 w-8" aria-hidden="true" />
            </div>
            <h2 className="mt-4 font-display text-3xl font-semibold leading-tight">Redação montada!</h2>
            <p className="mt-2 text-sm leading-6 text-primary-foreground/70">
              Você acertou a ordem de todos os {validation.total} blocos em {formatMMSS(seconds)}.
            </p>

            <div className="mt-6 flex justify-center gap-3">
              <SideMetric label="Precisão" value={`${efficiency}%`} />
              <SideMetric label="Tentativas" value={`${tries}`} />
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button onClick={onRestart} className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Jogar de novo
              </Button>
              <Button asChild variant="outline" className="border-primary-foreground/25 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/15">
                <Link href={`/games/${categorySlug}`}>Voltar ao hub</Link>
              </Button>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type ValidationResult = {
  correct: number;
  total: number;
  accuracy: number;
  isPerfect: boolean;
  sectionStatus: Record<SectionId, "idle" | "correct" | "wrong">;
  sectionMessage: Record<SectionId, string>;
  expectedCounts: Record<SectionId, number>;
  blockCorrectness: Record<string, boolean>;
};

function evaluateBoard(board: BoardState, level: AssemblyLevel): ValidationResult {
  const expectedFor = (section: SectionId) =>
    level.blocks
      .filter((block) => block.expectedSection === section && !block.distractor)
      .sort((a, b) => a.order - b.order)
      .map((block) => block.id);

  let correct = 0;
  let total = 0;
  const sectionStatus = {} as ValidationResult["sectionStatus"];
  const sectionMessage = {} as ValidationResult["sectionMessage"];
  const expectedCounts = {} as ValidationResult["expectedCounts"];
  const blockCorrectness: Record<string, boolean> = {};

  (["intro", "development", "conclusion"] as SectionId[]).forEach((section) => {
    const expectedIds = expectedFor(section);
    const current = board[section];
    total += expectedIds.length;
    expectedCounts[section] = expectedIds.length;

    const perBlockOk = current.map((id, index) => index < expectedIds.length && current[index] === expectedIds[index]);
    current.forEach((id, index) => {
      blockCorrectness[id] = perBlockOk[index];
      if (perBlockOk[index]) correct += 1;
    });

    const complete = current.length === expectedIds.length && perBlockOk.every(Boolean);
    sectionStatus[section] = current.length === 0 ? "idle" : complete ? "correct" : "wrong";
    sectionMessage[section] = complete
      ? "Perfeito — ordem e conteúdo corretos."
      : current.length !== expectedIds.length
        ? `Esta seção espera ${expectedIds.length} bloco${expectedIds.length === 1 ? "" : "s"} — você colocou ${current.length}.`
        : "Os blocos certos estão aqui, mas a ordem ainda não está correta.";
  });

  const distractorsSafe = level.blocks.filter((block) => block.distractor).every((block) => board.bank.includes(block.id));
  const accuracy = total ? Math.round((correct / total) * 100) : 0;

  return {
    correct,
    total,
    accuracy,
    isPerfect: correct === total && distractorsSafe,
    sectionStatus,
    sectionMessage,
    expectedCounts,
    blockCorrectness,
  };
}

function createInitialBoard(): BoardState {
  return {
    bank: [...shuffledBankIds],
    intro: [],
    development: [],
    conclusion: [],
  };
}

const essayLevel: AssemblyLevel = {
  title: "Estrutura essencial",
  description: "Poucos blocos para reconhecer a ordem basica: contexto, tese, argumento e intervencao.",
  blocks: [
    {
      id: "easy-context",
      expectedSection: "intro",
      order: 1,
      text: "A democratizacao do acesso a leitura e um desafio relevante para a formacao cidadã no Brasil.",
    },
    {
      id: "easy-arg",
      expectedSection: "development",
      order: 2,
      text: "Em primeiro plano, a falta de bibliotecas e acervos atualizados limita o contato cotidiano com diferentes generos textuais.",
    },
    {
      id: "easy-thesis",
      expectedSection: "development",
      order: 3,
      text: "Nesse sentido, a desigualdade socioeconomica e a baixa mediacao escolar dificultam esse processo.",
    },
    {
      id: "easy-proof",
      expectedSection: "development",
      order: 4,
      text: "Com isso, estudantes de regiões vulneráveis tendem a desenvolver menor repertório e menor autonomia interpretativa.",
    },
    {
      id: "easy-conclusion",
      expectedSection: "conclusion",
      order: 5,
      text: "Portanto, o Ministerio da Educacao deve ampliar bibliotecas escolares, por meio de investimento em acervos e formacao leitora, para reduzir essa desigualdade.",
    },
  ],
};

const shuffledBankIds = ["easy-proof", "easy-context", "easy-conclusion", "easy-arg", "easy-thesis"];
