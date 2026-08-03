"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Stethoscope, X } from "lucide-react";

import type { CorrectorCase, GameCategory, GameCompletion, GameDefinition, SkillTag } from "@/features/gamification/types";
import { EngineResult } from "@/games/_engines/EngineResult";
import { GRADE_LABEL, pointsToGrade } from "@/games/_engines/grade";
import { shuffle } from "@/games/_engines/shuffleOptions";
import { GameSessionShell } from "@/game-pages/games/components/GameSessionShell";
import { Surface } from "@/components/shared/premium-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game-store";
import { cn } from "@/utils";

function competencyTag(competency: string): SkillTag {
  return competency.toLowerCase() as SkillTag;
}

/** Engine `corrector`: marcar os problemas realmente presentes no parágrafo (precisão + recall). */
export function CorrectorSession({ game, category }: { game: GameDefinition; category: GameCategory }) {
  const completeGame = useGameStore((state) => state.completeGame);
  const recordCognitiveOutcome = useGameStore((state) => state.recordCognitiveOutcome);
  const cases = useMemo<CorrectorCase[]>(() => shuffle(game.corrector?.cases ?? []), [game.corrector]);

  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [checked, setChecked] = useState(false);
  const [correctTotal, setCorrectTotal] = useState(0);
  const [candidateTotal, setCandidateTotal] = useState(0);
  const [result, setResult] = useState<GameCompletion | null>(null);

  const current = cases[step];
  const candidates = useMemo(() => (current ? shuffle(current.candidates) : []), [current]);

  if (!current && !result) {
    return (
      <Surface className="text-center">
        <h1 className="text-2xl font-semibold">Atividade sem casos</h1>
        <Button asChild className="mt-4">
          <Link href={`/games/${category.slug}`}>Voltar à categoria</Link>
        </Button>
      </Surface>
    );
  }

  function toggle(id: string) {
    if (checked) return;
    setSelected((prev) => {
      const nextSet = new Set(prev);
      if (nextSet.has(id)) {
        nextSet.delete(id);
      } else {
        nextSet.add(id);
      }
      return nextSet;
    });
  }

  function diagnose() {
    if (checked || !current) return;
    let hits = 0;
    const tags = new Set<SkillTag>(current.tags ?? []);
    for (const candidate of current.candidates) {
      const marked = selected.has(candidate.id);
      if (marked === candidate.present) hits += 1;
      if (candidate.present) tags.add(competencyTag(candidate.competency));
    }
    // Qualidade diagnóstica do caso → nota S/A/B/C, alimentando os sinais cognitivos.
    const caseGrade = pointsToGrade((hits / Math.max(current.candidates.length, 1)) * 4);
    recordCognitiveOutcome(game, { tags: [...tags], grade: caseGrade });
    setCorrectTotal((v) => v + hits);
    setCandidateTotal((v) => v + current.candidates.length);
    setChecked(true);
  }

  function next() {
    if (step < cases.length - 1) {
      setStep((v) => v + 1);
      setSelected(new Set());
      setChecked(false);
      return;
    }
    setResult(completeGame(game, correctTotal, candidateTotal, 0));
  }

  function restart() {
    setStep(0);
    setSelected(new Set());
    setChecked(false);
    setCorrectTotal(0);
    setCandidateTotal(0);
    setResult(null);
  }

  const grade = pointsToGrade((correctTotal / Math.max(candidateTotal, 1)) * 4);

  return (
    <GameSessionShell
      categoryName={category.name}
      categorySlug={category.slug}
      title={game.name}
      step={step + (checked ? 1 : 0)}
      total={cases.length}
      xp={game.xpReward}
    >
      <div className="force-light space-y-5 md:space-y-6">
      {current && (
        <section className="game-surface bg-card p-4 md:p-6">
          <Badge className="mb-3 border-primary/20 bg-primary/10 text-primary">
            <Stethoscope className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Caso {step + 1}/{cases.length}
          </Badge>
          <blockquote className="rounded-md border border-border bg-background/64 p-4 text-base leading-7">{current.paragraph}</blockquote>
          <p className="mt-4 text-sm font-medium text-muted-foreground">Marque todos os problemas realmente presentes (há distratores):</p>

          <div className="mt-3 grid gap-2">
            {candidates.map((candidate) => {
              const marked = selected.has(candidate.id);
              const verdictOk = checked && marked === candidate.present;
              const verdictWrong = checked && marked !== candidate.present;
              return (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => toggle(candidate.id)}
                  disabled={checked}
                  className={cn(
                    "game-tile flex items-start gap-3 bg-background/64 p-3 text-left text-sm transition-colors",
                    !checked && marked && "border-primary/60 bg-primary/10",
                    !checked && !marked && "hover:border-primary/40",
                    verdictOk && "border-emerald-500/55 bg-emerald-500/10",
                    verdictWrong && "border-destructive/55 bg-destructive/10",
                  )}
                >
                  <span className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border", marked ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                    {marked ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                  </span>
                  <span className="flex-1">
                    {candidate.label}
                    {checked && (
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {candidate.present ? `Presente · ${candidate.competency}` : "Não está presente"} — {candidate.note}
                      </span>
                    )}
                  </span>
                  {checked ? (verdictOk ? <Check className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" /> : <X className="h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />) : null}
                </button>
              );
            })}
          </div>

          {checked ? (
            <Button onClick={next} className="mt-5">
              {step < cases.length - 1 ? "Próximo caso" : "Finalizar"}
            </Button>
          ) : (
            <Button onClick={diagnose} className="mt-5">
              Diagnosticar
            </Button>
          )}
        </section>
      )}

      <EngineResult
        result={result}
        grade={grade}
        headline={GRADE_LABEL[grade]}
        subline={`Você leu a matriz com precisão em ${correctTotal} de ${candidateTotal} classificações. Foco: enxergar o que realmente está presente.`}
        onRestart={restart}
        categorySlug={category.slug}
      />
      </div>
    </GameSessionShell>
  );
}
