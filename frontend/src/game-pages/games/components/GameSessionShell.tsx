"use client";

import Link from "next/link";
import { X } from "lucide-react";

import { readReturnTo } from "@/games/_engines/EngineResult";
import { cn } from "@/utils";

/**
 * Chrome escuro da sessão de jogo (fecha, contexto, progresso, chips de métrica) — painel único
 * arredondado (não faixa full-bleed), envolvendo header + progresso + conteúdo na mesma superfície
 * contínua. Escopo local via classe `.dark` (mesmos tokens do tema escuro do projeto, nunca ligado
 * globalmente) — só a sessão de jogo fica escura, o resto do app continua claro. O conteúdo do
 * jogo em si (`children`) deve usar um card explicitamente claro (`bg-card`/`.force-light`), não
 * herdar os tokens escuros diretamente.
 */
/** Status de uma rodada pro strip de pips do header (ver prop `pips`). */
export type SessionPipStatus = "correct" | "wrong" | "current" | "pending";

const PIP_TONE: Record<SessionPipStatus, string> = {
  correct: "bg-primary",
  wrong: "bg-destructive",
  current: "bg-primary/35",
  pending: "bg-muted-foreground/15",
};

export function GameSessionShell({
  categoryName,
  categorySlug,
  title,
  step,
  total,
  extraChips,
  onClose,
  pips,
  children,
}: {
  categoryName: string;
  categorySlug: string;
  title: string;
  step: number;
  total: number;
  /** Chip extra específico do engine (timer/vidas) — só nos que já têm isso de verdade. */
  extraChips?: React.ReactNode;
  /** Sobrescreve o "Fechar" pra um callback (P3a: preview do admin, dentro de um modal — não deve
   * navegar pra uma rota real de jogo). Sem isso, comportamento padrão (Link) é mantido. */
  onClose?: () => void;
  /** Substitui a barra de progresso linear por um strip de pips (um por rodada) no próprio header —
   * opt-in por engine (hoje só `order`). Sem essa prop, comportamento e visual seguem 100% iguais. */
  pips?: SessionPipStatus[];
  children: React.ReactNode;
}) {
  const returnTo = readReturnTo();
  const progress = total > 0 ? Math.round((Math.min(step, total) / total) * 100) : 0;

  return (
    <div className="game-shell-panel">
      <div className="game-session-header">
        <div className="flex min-w-0 items-center gap-2.5">
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="game-session-close"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <Link
              href={returnTo ?? `/games/${categorySlug}`}
              aria-label="Fechar"
              className="game-session-close"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
          <div className="min-w-0">
            <p className="truncate text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-primary">{categoryName}</p>
            <h1 className="truncate text-sm font-semibold leading-tight text-foreground">{title}</h1>
          </div>
        </div>

        {pips && pips.length > 0 && (
          <div className="game-session-pips" aria-hidden="true">
            {pips.map((status, index) => (
              <span key={index} className={cn("h-1.5 flex-1 rounded-full transition-colors duration-300", PIP_TONE[status])} />
            ))}
          </div>
        )}

        {!pips && (
          <div className="game-session-progress" aria-hidden="true">
            <div className="h-full rounded-full bg-primary transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
          </div>
        )}

        <div className="game-session-chips">
          {extraChips}
          <Chip>{Math.min(step, total)}/{total}</Chip>
        </div>
      </div>

      <div className="game-session-body force-light">{children}</div>
    </div>
  );
}

export function Chip({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-transparent bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
