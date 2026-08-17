"use client";

import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";

import { cn } from "@/utils";

/**
 * Alça de drag padrão do Donc — nunca o card inteiro é o handle. Área de toque de 44x44 (mínimo
 * recomendado), `touch-action: none` só aqui (o resto do item continua rolável/selecionável
 * normalmente), cursor `grab`/`grabbing` no mouse. Sem ícone de "6 pontinhos": o indicador é uma
 * barrinha discreta que só ganha destaque em hover/foco/drag — o handle se anuncia pela posição
 * (borda do card) e pelo cursor, não por um ícone chamativo.
 */
export function DragHandle({
  attributes,
  listeners,
  disabled,
  label = "Arrastar para reordenar",
  className,
}: {
  attributes?: DraggableAttributes;
  listeners?: DraggableSyntheticListeners;
  disabled?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      {...attributes}
      {...listeners}
      className={cn(
        "grid h-11 w-11 shrink-0 touch-none select-none place-items-center rounded-md text-muted-foreground outline-none transition-colors",
        "cursor-grab active:cursor-grabbing",
        "hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-primary/40",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="h-5 w-[3px] rounded-full bg-border transition-colors group-hover:bg-muted-foreground/60"
      />
    </button>
  );
}
