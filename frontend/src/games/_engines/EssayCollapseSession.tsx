"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS as DndCss } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "framer-motion";
import { Check, GripVertical, Wrench, X } from "lucide-react";

import type { CollapseRound, GameCategory, GameCompletion, GameDefinition } from "@/features/gamification/types";
import { EngineResult } from "@/games/_engines/EngineResult";
import { GRADE_LABEL, pointsToGrade } from "@/games/_engines/grade";
import { shuffle } from "@/games/_engines/shuffleOptions";
import { GameSessionShell } from "@/game-pages/games/components/GameSessionShell";
import { Surface } from "@/components/shared/premium-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game-store";
import { cn } from "@/utils";

type Cell = { id: string; correctIndex: number; text: string };

/** Engine `essay-collapse`: reconstruir uma redação degradada (reordenar + reconectar). */
export function EssayCollapseSession({ game, category }: { game: GameDefinition; category: GameCategory }) {
  const completeGame = useGameStore((state) => state.completeGame);
  const recordCognitiveOutcome = useGameStore((state) => state.recordCognitiveOutcome);
  const rounds = useMemo<CollapseRound[]>(() => shuffle(game.essayCollapse?.rounds ?? []), [game.essayCollapse]);

  const [step, setStep] = useState(0);
  const [checked, setChecked] = useState(false);
  const [connectorPicks, setConnectorPicks] = useState<Record<string, number>>({});
  const [hits, setHits] = useState(0);
  const [units, setUnits] = useState(0);
  const [result, setResult] = useState<GameCompletion | null>(null);
  const [missed, setMissed] = useState<{ id: string; text: string }[]>([]);

  const round = rounds[step];
  const initialCells = useMemo<Cell[]>(
    () => (round ? shuffle(round.fragments.map((f) => ({ id: f.id, correctIndex: f.correctIndex, text: f.text }))) : []),
    [round],
  );
  const [cells, setCells] = useState<Cell[]>(initialCells);
  // setState durante o render (não num efeito) é o padrão recomendado pelo React pra resetar
  // estado derivado de uma prop que mudou —
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
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
    if (!over || active.id === over.id || checked) return;
    setCells((prev) => arrayMove(prev, prev.findIndex((c) => c.id === active.id), prev.findIndex((c) => c.id === over.id)));
  }

  function reconstruct() {
    if (checked || !round) return;
    const orderOk = cells.every((c, i) => c.correctIndex === i);
    const connectors = round.connectors ?? [];
    let connectorHits = 0;
    for (const connector of connectors) {
      const pick = connectorPicks[connector.slotId];
      if (pick !== undefined && connector.options[pick]?.correct) connectorHits += 1;
    }
    const roundUnits = 1 + connectors.length;
    const roundHits = (orderOk ? 1 : 0) + connectorHits;
    setHits((v) => v + roundHits);
    setUnits((v) => v + roundUnits);
    if (!orderOk || connectorHits < connectors.length) setMissed((m) => [...m, { id: round.id, text: round.explanation }]);
    // Qualidade da reconstrução da rodada → nota S/A/B/C, alimentando os sinais cognitivos.
    const roundGrade = pointsToGrade((roundHits / Math.max(roundUnits, 1)) * 4);
    recordCognitiveOutcome(game, { tags: round.tags, grade: roundGrade });
    setChecked(true);
  }

  function next() {
    if (step < rounds.length - 1) {
      setStep((v) => v + 1);
      setChecked(false);
      setConnectorPicks({});
      return;
    }
    setResult(completeGame(game, hits, units, 0));
  }

  function restart() {
    setStep(0);
    setChecked(false);
    setConnectorPicks({});
    setHits(0);
    setUnits(0);
    setMissed([]);
    setResult(null);
    setTrackedStep(0);
    setCells(initialCells);
  }

  return (
    <GameSessionShell
      categoryName={category.name}
      categorySlug={category.slug}
      title={game.name}
      step={step + (checked ? 1 : 0)}
      total={rounds.length}
      xp={game.xpReward}
    >
      <div className="force-light space-y-5 md:space-y-6">
      {round && (
        <section className="game-surface bg-card p-4 md:p-6">
          <Badge className="mb-3 border-primary/20 bg-primary/10 text-primary">
            <Wrench className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Reconstrução {step + 1}/{rounds.length}
          </Badge>
          <p className="font-display text-lg leading-7 md:text-xl">{round.brief}</p>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={cells.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              <ol className="mt-4 space-y-2">
                {cells.map((cell, index) => (
                  <CollapseRow key={cell.id} cell={cell} position={index + 1} disabled={checked} verdict={checked ? (cell.correctIndex === index ? "ok" : "no") : undefined} />
                ))}
              </ol>
            </SortableContext>
          </DndContext>

          {round.connectors && round.connectors.length > 0 && (
            <div className="mt-5 space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Reconecte os trechos escolhendo o operador correto:</p>
              {round.connectors.map((connector) => (
                <div key={connector.slotId} className="rounded-md border border-border bg-card p-3 text-sm">
                  <p className="text-foreground/80">
                    …{connector.before} <span className="font-semibold text-primary">[?]</span> {connector.after}…
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {connector.options.map((option, oi) => {
                      const isPicked = connectorPicks[connector.slotId] === oi;
                      const reveal = checked && option.correct;
                      const wrong = checked && isPicked && !option.correct;
                      return (
                        <button
                          key={option.text}
                          type="button"
                          disabled={checked}
                          onClick={() => setConnectorPicks((p) => ({ ...p, [connector.slotId]: oi }))}
                          className={cn(
                            "rounded-md border px-3 py-1.5 text-sm transition-colors",
                            !checked && isPicked ? "border-primary bg-primary/10" : "border-border bg-background/70",
                            reveal && "border-emerald-500/55 bg-emerald-500/10",
                            wrong && "border-destructive/55 bg-destructive/10",
                          )}
                        >
                          {option.text}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <AnimatePresence>
            {checked && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 rounded-md border border-primary/20 bg-primary/5 p-4 text-sm leading-6">
                <p className="font-semibold text-foreground">Reconstrução conferida</p>
                <p className="mt-1 text-muted-foreground">{round.explanation}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {checked ? (
            <Button onClick={next} className="mt-5">{step < rounds.length - 1 ? "Próxima reconstrução" : "Finalizar"}</Button>
          ) : (
            <Button onClick={reconstruct} className="mt-5">Reconstruir</Button>
          )}
        </section>
      )}

      <EngineResult
        result={result}
        grade={pointsToGrade((hits / Math.max(units, 1)) * 4)}
        headline={GRADE_LABEL[pointsToGrade((hits / Math.max(units, 1)) * 4)]}
        subline={`Você recompôs o projeto de texto em ${hits} de ${units} elementos. Foco: ordem e conexões que sustentam a progressão.`}
        review={missed}
        onRestart={restart}
        categorySlug={category.slug}
      />
      </div>
    </GameSessionShell>
  );
}

function CollapseRow({ cell, position, disabled, verdict }: { cell: Cell; position: number; disabled?: boolean; verdict?: "ok" | "no" }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cell.id, disabled });
  const style = { transform: DndCss.Transform.toString(transform), transition };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-start gap-3 rounded-md border bg-background/70 p-3 text-sm leading-6",
        !disabled && "cursor-grab",
        isDragging && "opacity-50 shadow-lg",
        verdict === "ok" && "border-emerald-500/55 bg-emerald-500/10",
        verdict === "no" && "border-destructive/55 bg-destructive/10",
      )}
      {...(disabled ? {} : listeners)}
      {...attributes}
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border bg-card text-xs font-semibold">{position}</span>
      {verdict === "ok" ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" /> : verdict === "no" ? <X className="mt-0.5 h-4 w-4 shrink-0 text-red-700" aria-hidden="true" /> : <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
      <span>{cell.text}</span>
    </li>
  );
}
