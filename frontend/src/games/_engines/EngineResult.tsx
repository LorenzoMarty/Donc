"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw, Trophy } from "lucide-react";

import type { GameCompletion, Grade } from "@/features/gamification/types";
import { GRADE_LABEL, GRADE_TONE } from "@/games/_engines/grade";
import { FolhinhaMascot } from "@/components/shared/folhinha-mascot";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game-store";
import { cn } from "@/utils";

const ISSUE_STATE_ORDER: Record<string, number> = { DETECTED: 0, TRAINING: 1, IMPROVING: 2, MASTERED: 3 };

/** Feedback pós-treino honesto: só afirma evolução se algum problema realmente mudou de estado
 * pra melhor nesta sessão (dado vindo do backend, `IssueUpdate[]`) — nunca promete progresso que
 * os dados não sustentam. */
function PostSessionFeedback() {
  const issueUpdates = useGameStore((state) => state.lastIssueUpdates);
  if (!issueUpdates.length) return null;

  const improved = issueUpdates.some((update) => {
    const previous = update.previous_state ? (ISSUE_STATE_ORDER[update.previous_state] ?? -1) : -1;
    const next = ISSUE_STATE_ORDER[update.new_state] ?? -1;
    return next > previous;
  });

  return (
    <div className={cn("mt-4 rounded-2xl p-3.5 text-left text-sm leading-6", improved ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
      <p className="font-semibold">{improved ? "Boa evolução" : "Continue treinando"}</p>
      <p className="mt-0.5">
        {improved
          ? "Seu desempenho nesse ponto melhorou nesta sessão."
          : "Você ainda está desenvolvendo essa habilidade — repita o treino pra consolidar."}
      </p>
    </div>
  );
}

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
  eyebrow,
  review,
  onRestart,
  categorySlug,
  variant = "modal",
  decoration,
  children,
}: {
  result: GameCompletion | null;
  grade?: Grade;
  headline?: string;
  subline?: string;
  /** Rótulo acima do headline. Padrão: nome da grade, ou "Sessão concluída" sem grade. */
  eyebrow?: string;
  review?: { id: string; text: string }[];
  onRestart: () => void;
  categorySlug: string;
  /** "modal" (padrão): overlay fixo. "inline": substitui o conteúdo da sessão no lugar (sem overlay). */
  variant?: "modal" | "inline";
  /** Elemento decorativo posicionado atrás do conteúdo (ex.: confete). Só faz sentido em variant="modal". */
  decoration?: ReactNode;
  /** Conteúdo extra (ex.: grid de métricas) renderizado entre o cabeçalho e a lista de revisão. */
  children?: ReactNode;
}) {
  const returnTo = readReturnTo();

  const card = result && (
    <motion.section
      key="result"
      initial={variant === "modal" ? { opacity: 0, y: 24, scale: 0.96 } : { opacity: 0, scale: 0.96, y: 16 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={variant === "modal" ? { opacity: 0, y: 16, scale: 0.96 } : undefined}
      className={cn(
        "game-surface relative bg-card text-foreground",
        variant === "modal" ? "mobile-scroll max-h-[92dvh] w-full max-w-2xl overflow-y-auto p-4 text-center xs:p-5 md:p-6" : "p-5 text-center md:p-7",
      )}
    >
      {decoration}
      <div className="relative">
        {variant === "modal" && (
          <div className="mb-2 flex justify-center">
            <FolhinhaMascot mood="cheer" size={64} message="Mandou bem!" />
          </div>
        )}
        {grade ? (
          <div className={cn("mx-auto grid h-16 w-16 place-items-center rounded-md border text-2xl font-bold", GRADE_TONE[grade])}>
            {grade}
          </div>
        ) : (
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-md border border-primary/30 bg-primary text-primary-foreground">
            <Trophy className="h-8 w-8" aria-hidden="true" />
          </div>
        )}
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {eyebrow ?? (grade ? GRADE_LABEL[grade] : "Sessão concluída")}
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-normal">{headline ?? `${result.attempt.accuracy}%`}</h2>
        {subline && <p className="mt-2 text-sm leading-6 text-muted-foreground">{subline}</p>}
      </div>

      {children}

      <PostSessionFeedback />

      {review && review.length > 0 && (
        <div className="game-tile mt-5 border-amber-500/20 bg-amber-500/10 p-4 text-left">
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
          <Link href={returnTo ?? `/games/${categorySlug}`}>{returnTo ? "Próximo exercício" : "Voltar à categoria"}</Link>
        </Button>
      </div>
    </motion.section>
  );

  if (variant === "inline") {
    return <AnimatePresence mode="wait">{card}</AnimatePresence>;
  }

  return (
    <AnimatePresence>
      {result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] grid place-items-center bg-foreground/28 p-3 backdrop-blur-sm xs:p-4"
        >
          {card}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
