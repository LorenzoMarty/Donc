"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Loader2, Scissors, Sparkles } from "lucide-react";

import type { Grade, GameCategory, GameCompletion, GameDefinition, SurgeryCase, SurgerySegment } from "@/features/gamification/types";
import { EngineResult } from "@/games/_engines/EngineResult";
import { GRADE_LABEL, GRADE_TONE, pointsToGrade, gradeToPoints, summariseGrades } from "@/games/_engines/grade";
import { SessionHUD } from "@/game-pages/games/components/SessionHUD";
import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/http-client";
import { useGameStore } from "@/stores/game-store";
import { cn } from "@/utils";

type Slot = Extract<SurgerySegment, { slotId: string }>;
type RewriteEval = { grade: Grade; tecnica: number; naturalidade: number; sofisticacao: number; precisao: number; feedback: string; melhorias: string[] };

function isSlot(segment: SurgerySegment): segment is Slot {
  return typeof segment !== "string";
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Engine `text-surgery`: restaurar um texto degradado, slot a slot (escolha curada + reescrita por IA). */
export function TextSurgerySession({ game, category }: { game: GameDefinition; category: GameCategory }) {
  const completeGame = useGameStore((state) => state.completeGame);
  const recordSkillOutcomes = useGameStore((state) => state.recordSkillOutcomes);
  const streak = useGameStore((state) => state.streak.current);
  const cases = useMemo<SurgeryCase[]>(() => game.textSurgery?.cases ?? [], [game.textSurgery]);

  const [caseIndex, setCaseIndex] = useState(0);
  const [slotIndex, setSlotIndex] = useState(0);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [resolved, setResolved] = useState<Record<string, { grade: Grade; text: string }>>({});
  const [phase, setPhase] = useState<"answering" | "revealed">("answering");
  const [lastNote, setLastNote] = useState<string>("");
  const [rewriteText, setRewriteText] = useState("");
  const [rewriteEval, setRewriteEval] = useState<RewriteEval | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GameCompletion | null>(null);

  const current = cases[caseIndex];
  const slots = useMemo<Slot[]>(() => (current ? current.segments.filter(isSlot) : []), [current]);
  const slot = slots[slotIndex];
  const choiceOptions = useMemo(() => (slot?.options ? shuffle(slot.options) : []), [slot]);
  const totalSlots = useMemo(() => cases.reduce((sum, c) => sum + c.segments.filter(isSlot).length, 0), [cases]);

  if (!current && !result) {
    return (
      <Surface className="text-center">
        <h1 className="text-2xl font-semibold">Atividade sem texto</h1>
        <Button asChild className="mt-4"><Link href={`/games/${category.slug}`}>Voltar à categoria</Link></Button>
      </Surface>
    );
  }

  const avgGrade: Grade = grades.length ? pointsToGrade(grades.reduce((s, g) => s + gradeToPoints(g), 0) / grades.length) : "B";

  function applyGrade(grade: Grade, text: string, note: string, tags?: Slot["tags"]) {
    setResolved((r) => ({ ...r, [slot.slotId]: { grade, text } }));
    setGrades((g) => [...g, grade]);
    setLastNote(note);
    setPhase("revealed");
    if (tags?.length) recordSkillOutcomes(tags.map((tag) => ({ tag, correct: grade === "S" || grade === "A" })));
  }

  function pickChoice(optionText: string, grade: Grade, note: string) {
    if (phase !== "answering") return;
    applyGrade(grade, optionText, note, slot.tags);
  }

  async function submitRewrite() {
    if (phase !== "answering" || loading || !rewriteText.trim()) return;
    setLoading(true);
    try {
      const evaluation = await apiFetch<RewriteEval>("/ai/evaluate-rewrite", {
        method: "POST",
        body: JSON.stringify({ original: slot.base ?? "", rewritten: rewriteText, criteria: slot.criteria }),
      });
      setRewriteEval(evaluation);
      applyGrade(evaluation.grade, rewriteText, evaluation.feedback, slot.tags);
    } catch {
      // Degradação: se a IA falhar totalmente, registra grade neutra.
      setRewriteEval(null);
      applyGrade("B", rewriteText, "Não foi possível avaliar agora; considere a versão aceitável.", slot.tags);
    } finally {
      setLoading(false);
    }
  }

  function advance() {
    if (slotIndex < slots.length - 1) {
      setSlotIndex((v) => v + 1);
    } else if (caseIndex < cases.length - 1) {
      setCaseIndex((v) => v + 1);
      setSlotIndex(0);
    } else {
      const summary = summariseGrades(grades);
      setResult(completeGame(game, summary.score, summary.total, 0));
      return;
    }
    setPhase("answering");
    setRewriteText("");
    setRewriteEval(null);
    setLastNote("");
  }

  function restart() {
    setCaseIndex(0);
    setSlotIndex(0);
    setGrades([]);
    setResolved({});
    setPhase("answering");
    setRewriteText("");
    setRewriteEval(null);
    setResult(null);
  }

  const doneSlots = grades.length;

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        eyebrow={category.name}
        title={game.name}
        description={game.description}
        action={
          <Button asChild variant="outline">
            <Link href={`/games/${category.slug}`}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Categoria
            </Link>
          </Button>
        }
      />

      <SessionHUD accuracy={gradeToPoints(avgGrade) * 25} step={doneSlots} total={totalSlots} seconds={0} streak={streak} xp={game.xpReward} />

      {current && (
        <section className="game-surface bg-card p-4 md:p-6">
          <Badge className="mb-3 border-primary/20 bg-primary/10 text-primary">
            <Scissors className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Caso {caseIndex + 1}/{cases.length}
          </Badge>
          <p className="text-sm leading-6 text-foreground/80">{current.brief}</p>

          {/* Texto com slots inline */}
          <p className="mt-4 rounded-md border border-border bg-background/64 p-4 text-base leading-8">
            {current.segments.map((segment, i) => {
              if (typeof segment === "string") return <span key={i}>{segment}</span>;
              const done = resolved[segment.slotId];
              const isCurrent = slot && segment.slotId === slot.slotId && phase === "answering";
              if (done) {
                return (
                  <span key={i} className={cn("mx-0.5 rounded px-1.5 py-0.5 align-baseline", GRADE_TONE[done.grade])}>
                    {done.text}
                  </span>
                );
              }
              return (
                <span
                  key={i}
                  className={cn(
                    "mx-0.5 rounded px-1.5 py-0.5 align-baseline",
                    isCurrent ? "bg-primary/15 text-primary ring-2 ring-primary/40" : "bg-muted text-muted-foreground",
                  )}
                >
                  {isCurrent ? "◆ aqui" : "____"}
                </span>
              );
            })}
          </p>

          {phase === "answering" && slot?.mode === "choice" && (
            <div className="mt-5 grid gap-2">
              <p className="text-sm font-medium text-muted-foreground">Escolha a melhor restauração para o trecho destacado:</p>
              {choiceOptions.map((option) => (
                <button
                  key={option.text}
                  type="button"
                  onClick={() => pickChoice(option.text, option.grade, option.note)}
                  className="game-tile bg-background/64 p-3 text-left text-sm transition-colors hover:border-primary/50 hover:bg-primary/5"
                >
                  {option.text}
                </button>
              ))}
            </div>
          )}

          {phase === "answering" && slot?.mode === "rewrite" && (
            <div className="mt-5">
              <p className="text-sm font-medium text-muted-foreground">
                Reescreva o trecho à mão. {slot.criteria ? `Critério: ${slot.criteria}.` : ""}
              </p>
              {slot.base && <p className="mt-2 rounded-md border border-dashed border-border bg-background/40 p-3 text-sm text-muted-foreground">Original degradado: {slot.base}</p>}
              <textarea
                value={rewriteText}
                onChange={(e) => setRewriteText(e.target.value)}
                rows={3}
                placeholder="Sua reescrita..."
                className="mt-3 w-full rounded-md border border-border bg-background/70 p-3 text-sm outline-none focus:border-primary"
              />
              <Button onClick={submitRewrite} disabled={loading || !rewriteText.trim()} className="mt-3">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
                {loading ? "Avaliando com IA..." : "Avaliar reescrita"}
              </Button>
            </div>
          )}

          <AnimatePresence>
            {phase === "revealed" && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("mt-5 rounded-md border p-4 text-sm leading-6", GRADE_TONE[grades[grades.length - 1] ?? "B"])}>
                <p className="font-semibold">
                  Nota {grades[grades.length - 1]} — {GRADE_LABEL[grades[grades.length - 1] ?? "B"]}
                </p>
                <p className="mt-1 text-foreground/80">{lastNote}</p>
                {rewriteEval && (
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    <Dim label="Técnica" value={rewriteEval.tecnica} />
                    <Dim label="Naturalidade" value={rewriteEval.naturalidade} />
                    <Dim label="Sofisticação" value={rewriteEval.sofisticacao} />
                    <Dim label="Precisão" value={rewriteEval.precisao} />
                  </div>
                )}
                {rewriteEval?.melhorias?.length ? (
                  <ul className="mt-2 list-inside list-disc text-xs text-foreground/70">
                    {rewriteEval.melhorias.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                ) : null}
                <Button onClick={advance} className="mt-4">
                  {slotIndex < slots.length - 1 || caseIndex < cases.length - 1 ? "Próximo trecho" : "Finalizar"}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      <EngineResult
        result={result}
        grade={avgGrade}
        headline={`Restauração nível ${avgGrade}`}
        subline={`${doneSlots} trechos restaurados.`}
        onRestart={restart}
        categorySlug={category.slug}
      />
    </div>
  );
}

function Dim({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/50 px-2 py-1 text-center">
      <p className="text-[0.62rem] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
