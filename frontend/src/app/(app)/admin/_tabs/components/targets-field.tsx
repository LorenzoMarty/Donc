"use client";

import { Field } from "@/components/ui/field";
import { HUBS } from "@/features/gamification/symptoms";
import { cn } from "@/utils";

// Mesmos 7 codigos de CognitiveIssue do backend (src/memory/cognitive_issues.py::ISSUE_CODES),
// com o rotulo pt-BR ja existente em HUBS (mesmo mapeamento issue -> hub do RecommendationEngine).
const ISSUE_OPTIONS: { code: string; label: string }[] = [
  { code: "TEXT_ROBOTIC", label: HUBS["texto-robotico"].label },
  { code: "REPETITIVE_IDEAS", label: HUBS["repete-ideias"].label },
  { code: "WEAK_REPERTOIRE", label: HUBS["repertorio-nao-encaixa"].label },
  { code: "SHALLOW_ARGUMENTATION", label: HUBS["nao-aprofunda"].label },
  { code: "WEAK_THESIS", label: HUBS["introducao-sem-tese"].label },
  { code: "C3_LOW", label: HUBS["perde-na-c3"].label },
  { code: "FORMULAIC_CONCLUSION", label: HUBS["conclusao-formula"].label },
];

/** Seletor múltiplo dos problemas cognitivos que um conteúdo (aula/exercício/jogo) treina —
 * grava direto em `targets`, consumido pelo `RecommendationEngine` (P1 Bloco 1/9). */
export function TargetsField({
  value,
  onChange,
  hint,
  error,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  hint?: string;
  error?: string | null;
}) {
  function toggle(code: string, checked: boolean) {
    onChange(checked ? [...value, code] : value.filter((item) => item !== code));
  }

  return (
    <Field label="Problemas trabalhados" hint={hint} error={error}>
      <div className="grid gap-1 rounded-control bg-background/60 p-2 shadow-soft sm:grid-cols-2">
        {ISSUE_OPTIONS.map((option) => {
          const checked = value.includes(option.code);
          return (
            <label
              key={option.code}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-xs transition-colors hover:bg-muted/60",
                checked && "bg-primary/8 font-medium",
              )}
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-[hsl(var(--primary))]"
                checked={checked}
                onChange={(event) => toggle(option.code, event.target.checked)}
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </Field>
  );
}
