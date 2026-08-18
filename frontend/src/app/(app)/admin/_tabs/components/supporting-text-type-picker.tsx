"use client";

import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { SupportingText } from "@/types/api";

export type SupportingTextType = SupportingText["type"];
export type SupportingTextRequirement = { type: SupportingTextType; count: number };

export const SUPPORTING_TEXT_TYPE_OPTIONS: { value: SupportingTextType; label: string }[] = [
  { value: "motivador", label: "Texto motivador" },
  { value: "dados", label: "Dados" },
  { value: "repertorio", label: "Repertório" },
  { value: "imagem", label: "Imagem ou descrição visual" },
  { value: "grafico", label: "Gráfico" },
  { value: "infografico", label: "Infográfico" },
  { value: "postagem", label: "Postagem (rede social)" },
  { value: "manchete", label: "Manchete" },
  { value: "tirinha", label: "Tirinha (IA gera imagem)" },
  { value: "charge", label: "Charge (IA gera imagem)" },
];

export const MAX_SUPPORTING_TEXTS_PER_THEME = 4;

export function requirementsTotal(quantities: Partial<Record<SupportingTextType, number>>) {
  return Object.values(quantities).reduce((sum, value) => sum + (value ?? 0), 0);
}

export function requirementsToPayload(
  quantities: Partial<Record<SupportingTextType, number>>,
): SupportingTextRequirement[] {
  return SUPPORTING_TEXT_TYPE_OPTIONS.map((option) => ({ type: option.value, count: quantities[option.value] ?? 0 })).filter(
    (item) => item.count > 0,
  );
}

/**
 * REQ-1/REQ-3: checklist com quantidade por tipo de texto motivador, usado tanto ao gerar tema novo
 * quanto ao regenerar textos de um tema existente. Soma total das quantidades marcadas nunca passa
 * de MAX_SUPPORTING_TEXTS_PER_THEME — deixar tudo em zero significa "aleatório" (o backend sorteia).
 */
export function SupportingTextTypePicker({
  quantities,
  onChange,
  disabled,
}: {
  quantities: Partial<Record<SupportingTextType, number>>;
  onChange: (quantities: Partial<Record<SupportingTextType, number>>) => void;
  disabled?: boolean;
}) {
  const total = requirementsTotal(quantities);

  function setCount(type: SupportingTextType, next: number) {
    const clamped = Math.max(0, Math.min(MAX_SUPPORTING_TEXTS_PER_THEME, next));
    onChange({ ...quantities, [type]: clamped });
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground">Tipos de texto motivador (opcional)</p>
        <span className="text-xs text-muted-foreground">{total}/{MAX_SUPPORTING_TEXTS_PER_THEME}</span>
      </div>
      <div className="grid gap-1.5">
        {SUPPORTING_TEXT_TYPE_OPTIONS.map((option) => {
          const count = quantities[option.value] ?? 0;
          return (
            <div key={option.value} className="flex items-center justify-between gap-2 rounded-control bg-background/50 px-2.5 py-1.5">
              <span className="text-xs">{option.label}</span>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  disabled={disabled || count === 0}
                  onClick={() => setCount(option.value, count - 1)}
                  aria-label={`Diminuir quantidade de ${option.label}`}
                >
                  <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
                <span className="w-4 text-center text-xs tabular-nums">{count}</span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  disabled={disabled || total >= MAX_SUPPORTING_TEXTS_PER_THEME}
                  onClick={() => setCount(option.value, count + 1)}
                  aria-label={`Aumentar quantidade de ${option.label}`}
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {total === 0 ? "Nenhum tipo marcado: a IA sorteia uma combinação variada." : `Máximo de ${MAX_SUPPORTING_TEXTS_PER_THEME} textos por tema.`}
      </p>
    </div>
  );
}
