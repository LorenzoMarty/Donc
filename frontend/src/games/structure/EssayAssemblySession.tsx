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
import { CheckCircle2, Clock, RotateCcw, Trophy } from "lucide-react";

import type { GameCategory, GameCompletion, GameDefinition } from "@/features/gamification/types";
import { useDragSensors } from "@/games/_engines/useDragSensors";
import { GameSessionShell, Chip } from "@/game-pages/games/components/GameSessionShell";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game-store";
import { cn, formatMMSS } from "@/utils";

type SectionId = "intro" | "development" | "conclusion";
type ContainerId = "bank" | SectionId;
type BoardState = Record<ContainerId, string[]>;
type FeedbackState = "idle" | "correct" | "wrong";

type EssayBlock = {
  id: string;
  text: string;
  expectedSection?: SectionId;
  order: number;
  distractor?: boolean;
};

type AssemblyLevel = {
  id: "easy" | "hard";
  label: string;
  title: string;
  description: string;
  blocks: EssayBlock[];
};

const containerIds: ContainerId[] = ["bank", "intro", "development", "conclusion"];

export function EssayAssemblySession({ game, category }: { game: GameDefinition; category: GameCategory }) {
  const completeGame = useGameStore((state) => state.completeGame);
  const [levelId, setLevelId] = useState<AssemblyLevel["id"]>("easy");
  const level = essayLevels.find((item) => item.id === levelId) ?? essayLevels[0];
  const [board, setBoard] = useState<BoardState>(() => createInitialBoard(level));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>("idle");
  const [validation, setValidation] = useState<ValidationResult>(() => evaluateBoard(createInitialBoard(level), level));
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState<GameCompletion | null>(null);
  const [finalValidation, setFinalValidation] = useState<ValidationResult | null>(null);

  const sensors = useDragSensors({ keyboardCoordinateGetter: sortableKeyboardCoordinates });

  const blockMap = useMemo(() => new Map(level.blocks.map((block) => [block.id, block])), [level.blocks]);
  const activeBlock = activeId ? blockMap.get(activeId) : undefined;

  useEffect(() => {
    if (result) return;
    const start = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(start);
  }, [result]);

  function changeLevel(nextLevelId: AssemblyLevel["id"]) {
    const nextLevel = essayLevels.find((item) => item.id === nextLevelId) ?? essayLevels[0];
    const nextBoard = createInitialBoard(nextLevel);
    setLevelId(nextLevelId);
    setBoard(nextBoard);
    setValidation(evaluateBoard(nextBoard, nextLevel));
    setFeedback("idle");
    setSeconds(0);
    setResult(null);
    setFinalValidation(null);
    setActiveId(null);
  }

  function findContainer(id: UniqueIdentifier, snapshot: BoardState = board): ContainerId | null {
    const normalized = String(id);
    if (containerIds.includes(normalized as ContainerId)) return normalized as ContainerId;
    return containerIds.find((container) => snapshot[container].includes(normalized)) ?? null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
    setFeedback("idle");
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

      const next = {
        ...current,
        [activeContainer]: activeItems.filter((item) => item !== activeId),
        [overContainer]: [...overItems.slice(0, insertIndex), activeId, ...overItems.slice(insertIndex)],
      };
      setValidation(evaluateBoard(next, level));
      return next;
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
        setValidation(evaluateBoard(current, level));
        return current;
      }
      const items = current[activeContainer];
      const oldIndex = items.indexOf(activeId);
      const newIndex = items.indexOf(overId);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
        setValidation(evaluateBoard(current, level));
        return current;
      }
      const next = { ...current, [activeContainer]: arrayMove(items, oldIndex, newIndex) };
      setValidation(evaluateBoard(next, level));
      return next;
    });
    setActiveId(null);
  }

  function validate() {
    const nextValidation = evaluateBoard(board, level);
    setValidation(nextValidation);
    if (nextValidation.isPerfect) {
      setFeedback("correct");
      window.setTimeout(() => finish(nextValidation), 520);
      return;
    }
    setFeedback("wrong");
  }

  function finish(snapshot = validation) {
    if (result) return;
    const completion = completeGame(game, snapshot.correct, snapshot.total, seconds);
    setFinalValidation(snapshot);
    setResult(completion);
  }

  function resetBoard() {
    const nextBoard = createInitialBoard(level);
    setBoard(nextBoard);
    setValidation(evaluateBoard(nextBoard, level));
    setFeedback("idle");
    setSeconds(0);
    setResult(null);
    setFinalValidation(null);
    setActiveId(null);
  }

  const currentValidation = finalValidation ?? validation;

  return (
    <GameSessionShell
      categoryName={category.name}
      categorySlug={category.slug}
      title={game.name}
      step={validation.correct}
      total={validation.total}
      extraChips={
        <Chip>
          <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {formatMMSS(seconds)}
        </Chip>
      }
    >
      <div className="force-light">
          <motion.main
            animate={
              feedback === "wrong" ? { x: [0, -6, 6, -4, 4, 0] } : feedback === "correct" ? { scale: [1, 1.01, 1] } : { x: 0, scale: 1 }
            }
            transition={{ duration: feedback === "wrong" ? 0.34 : 0.44 }}
            className={cn(
              "game-surface relative overflow-hidden bg-card p-4 md:p-5",
              feedback === "correct" ? "border-emerald-500/45" : feedback === "wrong" ? "border-warning/45" : "",
            )}
          >
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-primary/45" aria-hidden="true" />
            <div className="mb-4 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              {essayLevels.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => changeLevel(item.id)}
                  className={cn(
                    "min-h-11 rounded-md border px-4 py-2 text-sm font-semibold transition-all",
                    level.id === item.id
                      ? "border-primary/50 bg-primary text-primary-foreground"
                      : "border-border bg-background/64 text-muted-foreground hover:border-primary/35 hover:bg-primary/10 hover:text-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
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
                <DropZone
                  id="bank"
                  title="Frases embaralhadas"
                  subtitle="Arraste para as secoes corretas"
                  items={board.bank}
                  blockMap={blockMap}
                  validation={validation}
                />
                <div className="grid gap-4">
                  <DropZone
                    id="intro"
                    title="Introducao"
                    subtitle="Contextualização e tese"
                    items={board.intro}
                    blockMap={blockMap}
                    validation={validation}
                  />
                  <DropZone
                    id="development"
                    title="Desenvolvimento"
                    subtitle="Argumentos, provas e progressão"
                    items={board.development}
                    blockMap={blockMap}
                    validation={validation}
                  />
                  <DropZone
                    id="conclusion"
                    title="Conclusao"
                    subtitle="Retomada e intervenção"
                    items={board.conclusion}
                    blockMap={blockMap}
                    validation={validation}
                  />
                </div>
              </div>

              <DragOverlay>{activeBlock ? <EssayBlockCard block={activeBlock} active /> : null}</DragOverlay>
            </DndContext>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Button onClick={validate}>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Validar estrutura
              </Button>
              <Button onClick={() => finish()} disabled={validation.correct === 0 || result !== null} variant="outline">
                Finalizar tentativa
              </Button>
              <Button onClick={resetBoard} variant="outline">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Reiniciar
              </Button>
            </div>
          </motion.main>

      <div className="force-light">
        <ResultModal result={result} validation={currentValidation} seconds={seconds} categorySlug={category.slug} onRestart={resetBoard} />
      </div>
      </div>
    </GameSessionShell>
  );
}

function DropZone({
  id,
  title,
  subtitle,
  items,
  blockMap,
  validation,
}: {
  id: ContainerId;
  title: string;
  subtitle: string;
  items: string[];
  blockMap: Map<string, EssayBlock>;
  validation: ValidationResult;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const sectionStatus = id === "bank" ? "idle" : validation.sectionStatus[id];

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "game-tile min-h-52 bg-card p-3 transition-all duration-200",
        isOver && "border-primary/55 bg-primary/10",
        sectionStatus === "correct" && "border-emerald-500/35 bg-emerald-500/10",
        sectionStatus === "wrong" && "border-warning/35 bg-warning/10",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <span className="game-chip bg-card px-2.5 py-1 text-xs font-semibold text-muted-foreground">{items.length}</span>
      </div>

      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {items.map((item) => {
              const block = blockMap.get(item);
              if (!block) return null;
              return <SortableEssayBlock key={item} block={block} />;
            })}
          </AnimatePresence>
          {items.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="game-tile grid min-h-28 place-items-center border-dashed bg-card/50 px-4 text-center text-sm leading-6 text-muted-foreground"
            >
              Solte blocos aqui
            </motion.div>
          )}
        </div>
      </SortableContext>
    </section>
  );
}

function SortableEssayBlock({ block }: { block: EssayBlock }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  return (
    <EssayBlockCard
      block={block}
      refCallback={setNodeRef}
      attributes={attributes}
      listeners={listeners}
      style={{ transform: DndCss.Transform.toString(transform), transition }}
      dragging={isDragging}
    />
  );
}

function EssayBlockCard({
  block,
  active,
  dragging,
  refCallback,
  attributes,
  listeners,
  style,
}: {
  block: EssayBlock;
  active?: boolean;
  dragging?: boolean;
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
      {...attributes}
      {...listeners}
      className={cn(
        "group game-tile touch-none bg-background/70 p-2 text-sm leading-6 text-foreground transition-colors",
        listeners && "cursor-grab active:cursor-grabbing",
        active && "border-primary/45 bg-card shadow-lg",
        block.distractor && "bg-muted/50 text-muted-foreground",
      )}
    >
      <div className="min-w-0 px-1 py-1">
        <p>{block.text}</p>
        {block.distractor && <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Distrator</p>}
      </div>
    </motion.article>
  );
}

function SideMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="game-tile bg-card p-3">
      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ResultModal({
  result,
  validation,
  seconds,
  categorySlug,
  onRestart,
}: {
  result: GameCompletion | null;
  validation: ValidationResult;
  seconds: number;
  categorySlug: string;
  onRestart: () => void;
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
            className="game-surface mobile-scroll relative max-h-[92dvh] w-full max-w-3xl overflow-y-auto bg-card p-4 text-foreground xs:p-5 md:p-6"
          >
            <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-primary/45" aria-hidden="true" />
            <div className="text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-md border border-primary/30 bg-primary text-primary-foreground">
                <Trophy className="h-8 w-8" aria-hidden="true" />
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Tentativa finalizada</p>
              <h2 className="mt-2 text-4xl font-semibold tracking-normal">Monte a Redação</h2>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <SideMetric label="Tempo" value={formatMMSS(seconds)} />
              <SideMetric label="Precisao" value={`${validation.accuracy}%`} />
              <SideMetric label="Acertos" value={`${validation.correct}/${validation.total}`} />
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button onClick={onRestart}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Jogar novamente
              </Button>
              <Button asChild variant="outline">
                <Link href={`/games/${categorySlug}`}>Voltar a categoria</Link>
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
};

function evaluateBoard(board: BoardState, level: AssemblyLevel): ValidationResult {
  const expected = (section: SectionId) =>
    level.blocks
      .filter((block) => block.expectedSection === section && !block.distractor)
      .sort((a, b) => a.order - b.order)
      .map((block) => block.id);

  let correct = 0;
  let total = 0;
  const sectionStatus = {} as ValidationResult["sectionStatus"];

  (["intro", "development", "conclusion"] as SectionId[]).forEach((section) => {
    const expectedIds = expected(section);
    const current = board[section];
    total += expectedIds.length;
    const sectionCorrect = expectedIds.every((id, index) => current[index] === id) && current.length === expectedIds.length;
    expectedIds.forEach((id, index) => {
      if (current[index] === id) correct += 1;
    });
    sectionStatus[section] = current.length === 0 ? "idle" : sectionCorrect ? "correct" : "wrong";
  });

  const distractorsSafe = level.blocks.filter((block) => block.distractor).every((block) => board.bank.includes(block.id));
  const accuracy = total ? Math.round((correct / total) * 100) : 0;

  return {
    correct,
    total,
    accuracy,
    isPerfect: correct === total && distractorsSafe,
    sectionStatus,
  };
}

function createInitialBoard(level: AssemblyLevel): BoardState {
  return {
    bank: shuffledIds[level.id],
    intro: [],
    development: [],
    conclusion: [],
  };
}

const essayLevels: AssemblyLevel[] = [
  {
    id: "easy",
    label: "Facil",
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
        id: "easy-thesis",
        expectedSection: "intro",
        order: 2,
        text: "Nesse sentido, a desigualdade socioeconomica e a baixa mediacao escolar dificultam esse processo.",
      },
      {
        id: "easy-arg",
        expectedSection: "development",
        order: 3,
        text: "Em primeiro plano, a falta de bibliotecas e acervos atualizados limita o contato cotidiano com diferentes generos textuais.",
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
  },
  {
    id: "hard",
    label: "Difícil",
    title: "Argumentação completa",
    description: "Mais blocos, dois argumentos e frases parecidas. Deixe distratores no banco para manter a redação limpa.",
    blocks: [
      {
        id: "hard-context",
        expectedSection: "intro",
        order: 1,
        text: "Na sociedade informacional, o dominio da leitura critica tornou-se requisito para participacao social e desempenho escolar.",
      },
      {
        id: "hard-thesis",
        expectedSection: "intro",
        order: 2,
        text: "Entretanto, a exclusao digital e a fragilidade das praticas pedagogicas impedem que esse dominio seja universalizado.",
      },
      {
        id: "hard-arg1",
        expectedSection: "development",
        order: 3,
        text: "Primeiramente, a desigualdade de acesso a internet impede que parte dos estudantes utilize bibliotecas digitais e plataformas de estudo.",
      },
      {
        id: "hard-arg1-proof",
        expectedSection: "development",
        order: 4,
        text: "Esse cenário aprofunda diferenças de repertório, pois o aluno conectado encontra mais fontes para comparar ideias e ampliar vocabulário.",
      },
      {
        id: "hard-arg2",
        expectedSection: "development",
        order: 5,
        text: "Além disso, muitas escolas tratam a leitura apenas como tarefa avaliativa, e não como hábito interpretativo permanente.",
      },
      {
        id: "hard-arg2-proof",
        expectedSection: "development",
        order: 6,
        text: "Dessa maneira, o estudante lê textos sem aprender a relacioná-los a problemas sociais, o que enfraquece sua argumentação.",
      },
      {
        id: "hard-close",
        expectedSection: "conclusion",
        order: 7,
        text: "Portanto, o Ministerio da Educacao deve criar programas de leitura digital orientada, com formacao docente e acesso gratuito a acervos.",
      },
      {
        id: "hard-detail",
        expectedSection: "conclusion",
        order: 8,
        text: "Tal medida deve ocorrer em parceria com secretarias estaduais, a fim de ampliar repertório e autonomia crítica dos estudantes.",
      },
      {
        id: "hard-distractor-1",
        order: 99,
        distractor: true,
        text: "Hoje em dia a internet esta em todos os lugares e isso resolve praticamente todos os problemas educacionais.",
      },
      {
        id: "hard-distractor-2",
        order: 100,
        distractor: true,
        text: "A leitura e importante desde sempre, entao basta que as pessoas queiram ler mais por vontade propria.",
      },
    ],
  },
];

const shuffledIds: Record<AssemblyLevel["id"], string[]> = {
  easy: ["easy-proof", "easy-context", "easy-conclusion", "easy-arg", "easy-thesis"],
  hard: [
    "hard-distractor-1",
    "hard-arg2-proof",
    "hard-context",
    "hard-close",
    "hard-arg1",
    "hard-detail",
    "hard-thesis",
    "hard-distractor-2",
    "hard-arg1-proof",
    "hard-arg2",
  ],
};
