"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw, Trophy } from "lucide-react";

import type { GameCompletion, Grade } from "@/features/gamification/types";
import { GRADE_LABEL, GRADE_TONE } from "@/games/_engines/grade";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils";

/** Lê `?returnTo=` da URL atual — destino para "voltar"/"próximo exercício" após a sessão. */
export function readReturnTo(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return new URLSearchParams(window.location.search).get("returnTo") ?? undefined;
}

/** Modal de resultado padrão para os engines cognitivos (feedback por grade/impacto). */
export function EngineResult({
  result,
  grade,
  headline,
  subline,
  review,
  onRestart,
  categorySlug,
}: {
  result: GameCompletion | null;
  grade?: Grade;
  headline?: string;
  subline?: string;
  review?: { id: string; text: string }[];
  onRestart: () => void;
  categorySlug: string;
}) {
  const returnTo = readReturnTo();
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
              {grade ? (
                <div className={cn("mx-auto grid h-16 w-16 place-items-center rounded-md border text-2xl font-bold", GRADE_TONE[grade])}>
                  {grade}
                </div>
              ) : (
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-md border border-primary/30 bg-primary text-primary-foreground">
                  <Trophy className="h-8 w-8" aria-hidden="true" />
                </div>
              )}
              {result.rankUp && (
                <div className="mx-auto mt-4 w-fit rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  Rank up - {result.rankName}
                </div>
              )}
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {grade ? GRADE_LABEL[grade] : "Sessão concluída"}
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-normal">{headline ?? `${result.attempt.accuracy}%`}</h2>
              {subline && <p className="mt-2 text-sm leading-6 text-muted-foreground">{subline}</p>}
              <p className="mt-1 text-sm font-medium text-primary">+{result.xpEarned} XP</p>
            </div>

            {review && review.length > 0 && (
              <div className="game-tile mt-5 border-amber-500/20 bg-amber-500/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">Para revisar</p>
                <div className="mt-3 space-y-2">
                  {review.map((item) => (
                    <p key={item.id} className="text-sm leading-6 text-muted-foreground">
                      {item.text}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button onClick={onRestart}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Jogar novamente
              </Button>
              <Button asChild variant="outline">
                <Link href={returnTo ?? `/games/${categorySlug}`}>
                  {returnTo ? "Próximo exercício" : "Voltar à categoria"}
                </Link>
              </Button>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
