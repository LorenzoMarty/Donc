"use client";

import Link from "next/link";
import { X } from "lucide-react";

import { readReturnTo } from "@/games/_engines/EngineResult";
import { cn } from "@/utils";

/**
 * Chrome escuro e compacto da sessão de jogo (fecha, contexto, progresso, chips de métrica) —
 * substitui o antigo `PageHeader` + `SessionHUD` claros. Escopo local via classe `.dark` (mesmos
 * tokens do tema escuro do projeto, nunca ligado globalmente) — só a sessão de jogo fica escura,
 * o resto do app continua claro. O conteúdo do jogo em si (`children`) deve usar um card
 * explicitamente claro (`bg-white`), não `bg-card`/`game-surface`, pra não herdar os tokens escuros.
 */
export function GameSessionShell({
  categoryName,
  categorySlug,
  title,
  step,
  total,
  xp,
  extraChips,
  children,
}: {
  categoryName: string;
  categorySlug: string;
  title: string;
  step: number;
  total: number;
  xp: number;
  /** Chip extra específico do engine (timer/vidas) — só nos que já têm isso de verdade. */
  extraChips?: React.ReactNode;
  children: React.ReactNode;
}) {
  const returnTo = readReturnTo();
  const progress = total > 0 ? Math.round((Math.min(step, total) / total) * 100) : 0;

  return (
    <div className="dark bg-background px-3 text-foreground md:px-4">
      <div className="flex items-center justify-between gap-3 py-3 md:py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link
            href={returnTo ?? `/games/${categorySlug}`}
            aria-label="Fechar"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-control border border-border text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-primary">{categoryName}</p>
            <h1 className="truncate text-sm font-semibold leading-tight text-foreground">{title}</h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {extraChips}
          <Chip>{Math.min(step, total)}/{total}</Chip>
          <Chip>★ {xp} XP</Chip>
        </div>
      </div>

      <div className="h-1 w-full bg-muted/40">
        <div className="h-full bg-primary transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
      </div>

      <div className="pt-3 md:pt-6">{children}</div>
    </div>
  );
}

export function Chip({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-control border border-border bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
