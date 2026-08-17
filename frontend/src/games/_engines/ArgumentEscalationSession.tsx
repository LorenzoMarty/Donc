"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, TrendingUp, X } from "lucide-react";

import type { EscalationOption, GameCategory, GameCompletion, GameDefinition, SkillTag } from "@/features/gamification/types";
import { EngineResult } from "@/games/_engines/EngineResult";
import { GRADE_LABEL, pointsToGrade } from "@/games/_engines/grade";
import { shuffle } from "@/games/_engines/shuffleOptions";
import { GameSessionShell } from "@/game-pages/games/components/GameSessionShell";
import { Surface } from "@/components/shared/premium-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game-store";
import { cn } from "@/utils";

type Step = { theme: string; level: number; instruction: string; options: EscalationOption[]; tags?: SkillTag[] };

const ERROR_LIMIT = 5;

/** Engine `argument-escalation`: subir a escada da tese, do raso ao sofisticado. Errar derruba
 * um degrau (mesma escada); acumular 5 erros encerra a sessão. */
export function ArgumentEscalationSession({ game, category }: { game: GameDefinition; category: GameCategory }) {
  const completeGame = useGameStore((state) => state.completeGame);
  const recordCognitiveOutcome = useGameStore((state) => state.recordCognitiveOutcome);

  const steps = useMemo<Step[]>(() => {
    const ladders = game.escalation?.ladders ?? [];
    const flat: Step[] = [];
    for (const ladder of ladders) {
      for (const rung of ladder.rungs) {
        flat.push({ theme: ladder.theme, level: rung.level, instruction: rung.instruction, options: shuffle(rung.options), tags: ladder.tags });
      }
    }
    return flat;
  }, [game.escalation]);

  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [errors, setErrors] = useState(0);
  const [result, setResult] = useState<GameCompletion | null>(null);
  const [missed, setMissed] = useState<{ id: string; text: string }[]>([]);
  // Degraus já resolvidos corretamente ao menos uma vez — evita contar de novo quando o aluno
  // volta e reacerta um degrau que tinha derrubado (mecânica de "descer" após erro).
  const [solved, setSolved] = useState<Set<number>>(new Set());

  const current = steps[step];
  const maxLevel = useMemo(() => steps.reduce((m, s) => Math.max(m, s.level), 0), [steps]);
  const grade = pointsToGrade((score / Math.max(steps.length, 1)) * 4);

  if (!current && !result) {
    return (
      <Surface className="text-center">
        <h1 className="text-2xl font-semibold">Atividade sem escada</h1>
        <Button asChild className="mt-4">
          <Link href={`/games/${category.slug}`}>Voltar à categoria</Link>
        </Button>
      </Surface>
    );
  }

  function choose(index: number) {
    if (picked !== null || !current) return;
    const correct = current.options[index]?.correct === true;
    setPicked(index);
    setLastCorrect(correct);
    if (correct) {
      if (!solved.has(step)) {
        setScore((v) => v + 1);
        setSolved((prev) => new Set(prev).add(step));
      }
    } else {
      const right = current.options.find((o) => o.correct);
      setMissed((m) => [...m, { id: `${step}-${errors}`, text: `Nível ${current.level}: ${right?.note ?? "veja o patamar superior."}` }]);
      setErrors((v) => v + 1);
    }
    recordCognitiveOutcome(game, { tags: current.tags, correct });
  }

  function next() {
    // 5º erro encerra a sessão imediatamente, com o desempenho até aqui.
    if (!lastCorrect && errors >= ERROR_LIMIT) {
      setResult(completeGame(game, score, steps.length, 0));
      return;
    }
    if (!lastCorrect) {
      // Errar derruba um degrau na mesma escada; no 1º degrau, repete o mesmo degrau.
      setStep((v) => (current.level > 1 ? v - 1 : v));
      setPicked(null);
      return;
    }
    if (step < steps.length - 1) {
      setStep((v) => v + 1);
      setPicked(null);
      return;
    }
    setResult(completeGame(game, score, steps.length, 0));
  }

  function restart() {
    setStep(0);
    setPicked(null);
    setLastCorrect(false);
    setScore(0);
    setErrors(0);
    setMissed([]);
    setSolved(new Set());
    setResult(null);
  }

  // Dicas diminuem conforme sobe: notas só aparecem após escolher, e a partir do nível 4 sem rótulos extras.
  const showHints = current ? current.level <= 3 : false;

  return (
    <GameSessionShell
      categoryName={category.name}
      categorySlug={category.slug}
      title={game.name}
      step={step + (picked !== null ? 1 : 0)}
      total={steps.length}
    >
      <div className="force-light space-y-5 md:space-y-6">
      {current && (
        <motion.section key={step} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="game-surface bg-card p-4 md:p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge className="border-primary/20 bg-primary/10 text-primary">
              <TrendingUp className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Degrau {current.level}/{maxLevel}
            </Badge>
            <Badge variant="outline">{current.theme}</Badge>
            <Badge variant={errors >= ERROR_LIMIT - 1 ? "destructive" : "outline"}>
              Erros: {errors}/{ERROR_LIMIT}
            </Badge>
          </div>

          {/* Escada visual */}
          <div className="mb-4 flex items-end gap-1" aria-hidden="true">
            {Array.from({ length: maxLevel }).map((_, i) => (
              <div
                key={i}
                className={cn("flex-1 rounded-t-sm", i < current.level ? "bg-primary" : "bg-muted")}
                style={{ height: `${10 + (i + 1) * 6}px` }}
              />
            ))}
          </div>

          <h2 className="font-display text-xl font-semibold leading-7 tracking-normal md:text-2xl">{current.instruction}</h2>
          {!showHints && <p className="mt-1 text-xs text-muted-foreground">Sem dicas neste patamar — escolha pela profundidade real.</p>}

          <div className="mt-5 grid gap-3">
            {current.options.map((option, index) => {
              const isRight = picked !== null && option.correct;
              const isWrongPick = picked === index && !option.correct;
              return (
                <button
                  key={option.text}
                  type="button"
                  onClick={() => choose(index)}
                  disabled={picked !== null}
                  className={cn(
                    "game-tile bg-background/64 p-4 text-left text-sm leading-6 transition-colors",
                    picked === null && "hover:border-primary/50 hover:bg-primary/5",
                    isRight && "border-emerald-500/55 bg-emerald-500/10",
                    isWrongPick && "border-warning/55 bg-warning/10",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span>{option.text}</span>
                    {isRight ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" /> : isWrongPick ? <X className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" /> : null}
                  </div>
                  {picked !== null && option.note && (isRight || isWrongPick) && (
                    <p className="mt-2 text-xs text-muted-foreground">{option.note}</p>
                  )}
                </button>
              );
            })}
          </div>

          {picked !== null && (
            <Button onClick={next} className="mt-5" variant={lastCorrect ? "default" : "outline"}>
              {!lastCorrect
                ? errors >= ERROR_LIMIT
                  ? "Encerrar sessão"
                  : current.level > 1
                    ? "Descer um degrau"
                    : "Tentar de novo"
                : step < steps.length - 1
                  ? "Próximo degrau"
                  : "Finalizar"}
            </Button>
          )}
        </motion.section>
      )}

      <EngineResult
        result={result}
        grade={grade}
        headline={GRADE_LABEL[grade]}
        subline={`Você sustentou a progressão em ${score} de ${steps.length} degraus. Foco: aprofundar de verdade, não só responder.`}
        review={missed}
        onRestart={restart}
        categorySlug={category.slug}
      />
      </div>
    </GameSessionShell>
  );
}
