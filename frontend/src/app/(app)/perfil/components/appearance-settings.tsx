"use client";

import { useState } from "react";
import { RotateCcw, Type } from "lucide-react";
import { useTheme } from "next-themes";

import { Surface } from "@/components/shared/premium-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils";
import {
  type Appearance,
  DEFAULT_APPEARANCE,
  FONT_SCALE_LEVELS,
  LINE_HEIGHT_LEVELS,
  applyAppearance,
  readAppearance,
  writeAppearance,
} from "@/lib/appearance";

const THEME_OPTIONS: { label: string; value: string }[] = [
  { label: "Claro", value: "light" },
  { label: "Escuro", value: "dark" },
  { label: "Sistema", value: "system" },
];

/** Seção "Aparência": personaliza tamanho da letra, altura de linha e tema em toda a interface. */
export function AppearanceSettings() {
  const [pref, setPref] = useState<Appearance>(() => readAppearance());
  const { theme, setTheme } = useTheme();

  function update(next: Appearance) {
    setPref(next);
    writeAppearance(next);
    applyAppearance(next);
  }

  return (
    <Surface>
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-control bg-primary/12 text-primary">
          <Type className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-normal">Aparência</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Muda tema, tamanho da letra e espaçamento em toda a plataforma.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        <Control
          label="Tema"
          options={THEME_OPTIONS}
          active={theme ?? "system"}
          onSelect={(value) => setTheme(value)}
        />
        <Control
          label="Tamanho da letra"
          options={FONT_SCALE_LEVELS}
          active={pref.fontScale}
          onSelect={(value) => update({ ...pref, fontScale: value })}
        />
        <Control
          label="Altura de linha"
          options={LINE_HEIGHT_LEVELS}
          active={pref.lineHeight}
          onSelect={(value) => update({ ...pref, lineHeight: value })}
        />
      </div>

      <div className="mt-5 rounded-control bg-muted/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Prévia</p>
        <p className="mt-2 text-foreground" style={{ lineHeight: pref.lineHeight }}>
          &ldquo;A proposta de intervenção deve ser completa: agente, ação, meio, finalidade e detalhamento.&rdquo; — ajuste até esse tipo de frase ficar confortável de ler.
        </p>
      </div>

      <Button
        variant="outline"
        className="mt-4"
        onClick={() => update(DEFAULT_APPEARANCE)}
        disabled={pref.fontScale === DEFAULT_APPEARANCE.fontScale && pref.lineHeight === DEFAULT_APPEARANCE.lineHeight}
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Restaurar padrão
      </Button>
    </Surface>
  );
}

function Control<T extends number | string>({
  label,
  options,
  active,
  onSelect,
}: {
  label: string;
  options: { label: string; value: T }[];
  active: T;
  onSelect: (value: T) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = opt.value === active;
          return (
            <button
              key={opt.label}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(opt.value)}
              className={cn(
                "rounded-control px-4 py-2 text-sm font-semibold transition-colors",
                selected
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
