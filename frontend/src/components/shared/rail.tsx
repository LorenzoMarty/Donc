"use client";

import { useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/utils";

/** Fileira de scroll horizontal com snap, estilo "linha de catálogo" (streaming). Genérica: recebe cards como children. */
export function Rail({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollByAmount(direction: 1 | -1) {
    scrollRef.current?.scrollBy({ left: direction * 320, behavior: "smooth" });
  }

  return (
    <section className={cn("space-y-3", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3">
          {title ? <h2 className="text-lg font-semibold tracking-normal text-foreground">{title}</h2> : <span />}
          <div className="flex items-center gap-2">
            {action}
            <div className="hidden items-center gap-1.5 sm:flex">
              <button
                type="button"
                onClick={() => scrollByAmount(-1)}
                aria-label="Rolar para a esquerda"
                className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => scrollByAmount(1)}
                aria-label="Rolar para a direita"
                className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}
      <div ref={scrollRef} className="no-scrollbar mobile-scroll flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
        {children}
      </div>
    </section>
  );
}
