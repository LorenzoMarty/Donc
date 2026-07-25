"use client";

import { useState } from "react";
import { Palette } from "lucide-react";

import { Surface } from "@/components/shared/premium-ui";
import { cn } from "@/utils";
import { ACCENT_OPTIONS, applyAccent, normalizeAccent, readAccent, writeAccent } from "@/lib/accent";

/** Seção "Cor de destaque": personaliza o accent (--primary/--ring) em toda a interface. */
export function AccentSettings() {
  const [accent, setAccent] = useState<string>(() => readAccent());

  function select(hex: string) {
    const next = normalizeAccent(hex);
    setAccent(next);
    writeAccent(next);
    applyAccent(next);
  }

  return (
    <Surface>
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-control bg-primary/12 text-primary">
          <Palette className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-normal">Cor de destaque</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Muda a cor de ênfase em toda a plataforma.</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {ACCENT_OPTIONS.map((option) => {
          const selected = option.hex.toLowerCase() === accent.toLowerCase();
          return (
            <button
              key={option.hex}
              type="button"
              aria-pressed={selected}
              aria-label={option.label}
              title={option.label}
              onClick={() => select(option.hex)}
              className={cn(
                "grid h-10 w-10 place-items-center rounded-full transition-transform duration-150 hover:scale-110",
                selected && "ring-2 ring-offset-2 ring-offset-card",
              )}
              style={selected ? ({ "--tw-ring-color": option.hex } as React.CSSProperties) : undefined}
            >
              <span className="h-8 w-8 rounded-full shadow-soft" style={{ backgroundColor: option.hex }} />
            </button>
          );
        })}
      </div>
    </Surface>
  );
}
