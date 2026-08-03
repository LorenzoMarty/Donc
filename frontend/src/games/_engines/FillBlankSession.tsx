"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, CornerDownLeft, RotateCcw, X } from "lucide-react";

import { selectAdaptivePool } from "@/features/gamification/adaptive";
import type { GameCategory, GameCompletion, GameDefinition, FillBlankRound } from "@/features/gamification/types";
import { shuffle } from "@/games/_engines/shuffleOptions";
import { SessionHUD } from "@/game-pages/games/components/SessionHUD";
import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game-store";
import { cn } from "@/utils";

/** Normaliza para comparacao tolerante: minusculas, sem acento, sem pontuacao de borda, espacos colapsados. */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[.,;:!?"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Engine `fill-blank`: o aluno digita a resposta que completa a lacuna `___`.
 * Sem opcoes — exige produção ativa. Aceita variantes via `accepted[]`.
 */
export function FillBlankSession({ game, category }: { game: GameDefinition; category: GameCategory }) {
  const completeGame = useGameStore((state) => state.completeGame);
  const streak = useGameStore((state) => state.streak.current);
  const adaptive = useGameStore((state) => state.adaptive);
  const rounds = useMemo<FillBlankRound[]>(
    () => selectAdaptivePool(game, game.fillBlank?.rounds ?? [], adaptive, shuffle),
    [game, adaptive],
  );

  const [step, setStep] = useState(0);
  const [value, setValue] = useState("");
  const [verdict, setVerdict] = useState<"correct" | "wrong" | null>(null);
  const [score, setScore] = useState(0);
  const [seconds] = useState(0);
  const [result, setResult] = useState<GameCompletion | null>(null);

  const round = rounds[step];
  const acceptedSet = useMemo(() => new Set((round?.accepted ?? []).map(normalize)), [round]);
  const liveAccuracy = step ? Math.round((score / step) * 100) : 100;

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

  function check() {
    if (verdict || !round) return;
    const ok = acceptedSet.has(normalize(value));
    setVerdict(ok ? "correct" : "wrong");
    if (ok) setScore((v) => v + 1);
  }

  function next() {
    const finalScore = score;
    if (step < rounds.length - 1) {
      setStep((v) => v + 1);
      setValue("");
      setVerdict(null);
      return;
    }
    const completion = completeGame(game, finalScore, rounds.length, seconds);
    setResult(completion);
  }

  function restart() {
    setStep(0);
    setValue("");
    setVerdict(null);
    setScore(0);
    setResult(null);
  }

  const [before, after] = round ? splitBlank(round.prompt) : ["", ""];

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
        seconds={seconds}
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
            <div className="mb-5 flex flex-wrap gap-2">
              <Badge variant="secondary">{game.difficulty}</Badge>
              <Badge variant="outline">{game.skill}</Badge>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Complete a lacuna · {step + 1} de {rounds.length}
            </p>

            <p className="mt-4 text-xl font-semibold leading-9 tracking-normal md:text-2xl">
              {before}
              <span
                className={cn(
                  "mx-1 inline-flex min-w-28 items-center justify-center rounded-md border-2 border-dashed px-2 py-0.5 align-middle",
                  verdict === "correct"
                    ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-800"
                    : verdict === "wrong"
                      ? "border-destructive/60 bg-destructive/10 text-red-800"
                      : "border-primary/50 bg-primary/5 text-primary",
                )}
              >
                {verdict ? value || "—" : "?"}
              </span>
              {after}
            </p>

            <form
              className="mt-6 flex flex-col gap-3 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                if (verdict) next();
                else check();
              }}
            >
              <input
                type="text"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                disabled={verdict !== null}
                autoFocus
                placeholder="Digite sua resposta..."
                className="flex-1 rounded-md border border-border bg-background/70 px-4 py-3 text-base outline-none transition-colors focus:border-primary focus:bg-background disabled:opacity-70"
              />
              {verdict ? (
                <Button type="submit">
                  {step < rounds.length - 1 ? "Próxima" : "Finalizar"}
                  <CornerDownLeft className="h-4 w-4" aria-hidden="true" />
                </Button>
              ) : (
                <Button type="submit" disabled={!value.trim()}>
                  Verificar
                </Button>
              )}
            </form>

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
                  <p className="flex items-center gap-2 font-semibold">
                    {verdict === "correct" ? (
                      <>
                        <Check className="h-4 w-4" aria-hidden="true" /> Correto
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4" aria-hidden="true" /> Resposta esperada: {round.accepted[0]}
                      </>
                    )}
                  </p>
                  <p className="mt-1 text-foreground/80">{round.explanation}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        ) : (
          <ResultCard result={result} total={rounds.length} onRestart={restart} categorySlug={category.slug} />
        )}
      </AnimatePresence>
    </div>
  );
}

function splitBlank(prompt: string): [string, string] {
  const index = prompt.indexOf("___");
  if (index === -1) return [prompt + " ", ""];
  return [prompt.slice(0, index), prompt.slice(index + 3)];
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
        Você acertou {result?.attempt.score ?? 0} de {total} e recebeu {result?.xpEarned ?? 0} XP.
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
