"use client";

import type { GameDifficulty } from "@/features/gamification/types";
import { cn } from "@/utils";

export type GameFilterState = {
  difficulty: "Todos" | GameDifficulty;
};

export const defaultGameFilters: GameFilterState = {
  difficulty: "Todos",
};

export function GameFilters({ value, onChange }: { value: GameFilterState; onChange: (value: GameFilterState) => void }) {
  return (
    <div className="grid min-w-0 gap-2">
      <FilterGroup
        label="Dificuldade"
        items={["Todos", "Essencial", "Intermediario", "Avancado"]}
        active={value.difficulty}
        onSelect={(difficulty) => onChange({ ...value, difficulty: difficulty as GameFilterState["difficulty"] })}
      />
    </div>
  );
}

function FilterGroup({
  label,
  items,
  active,
  onSelect,
}: {
  label: string;
  items: Array<string | { label: string; value: string }>;
  active: string;
  onSelect: (item: string) => void;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <div className="mobile-scroll flex w-full min-w-0 max-w-full gap-2 overflow-x-auto pb-1 no-scrollbar">
        {items.map((item) => {
          const option = typeof item === "string" ? { label: item, value: item } : item;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className={cn(
                "game-chip min-h-10 shrink-0 px-3 text-sm font-semibold transition-colors",
                active === option.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-background/70 text-muted-foreground hover:bg-primary/10 hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
