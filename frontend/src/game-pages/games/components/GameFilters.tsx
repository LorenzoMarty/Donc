"use client";

import type { GameDifficulty, GameRarity } from "@/features/gamification/types";
import { cn } from "@/utils";

export type GameFilterState = {
  difficulty: "Todos" | GameDifficulty;
  rarity: "Todas" | GameRarity;
  status: "Todos" | "Nao iniciados" | "Em progresso" | "Dominados";
};

export const defaultGameFilters: GameFilterState = {
  difficulty: "Todos",
  rarity: "Todas",
  status: "Todos",
};

export function GameFilters({ value, onChange }: { value: GameFilterState; onChange: (value: GameFilterState) => void }) {
  return (
    <div className="grid min-w-0 gap-2 md:grid-cols-3">
      <FilterGroup
        label="Dificuldade"
        items={["Todos", "Essencial", "Intermediario", "Avancado"]}
        active={value.difficulty}
        onSelect={(difficulty) => onChange({ ...value, difficulty: difficulty as GameFilterState["difficulty"] })}
      />
      <FilterGroup
        label="Raridade"
        items={[
          { label: "Todas", value: "Todas" },
          { label: "Bronze", value: "comum" },
          { label: "Prata", value: "raro" },
          { label: "Ouro", value: "epico" },
          { label: "Diamante", value: "lendario" },
        ]}
        active={value.rarity}
        onSelect={(rarity) => onChange({ ...value, rarity: rarity as GameFilterState["rarity"] })}
      />
      <FilterGroup
        label="Status"
        items={["Todos", "Nao iniciados", "Em progresso", "Dominados"]}
        active={value.status}
        onSelect={(status) => onChange({ ...value, status: status as GameFilterState["status"] })}
      />
    </div>
  );
}

function FilterGroup({ label, items, active, onSelect }: { label: string; items: Array<string | { label: string; value: string }>; active: string; onSelect: (item: string) => void }) {
  return (
    <div className="min-w-0">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <div className="flex w-full min-w-0 max-w-full gap-2 overflow-x-auto pb-1 no-scrollbar">
        {items.map((item) => {
          const option = typeof item === "string" ? { label: item, value: item } : item;
          return (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={cn(
              "game-chip min-h-9 shrink-0 px-3 text-sm font-semibold transition-colors",
              active === option.value ? "bg-primary text-primary-foreground" : "bg-background/70 text-muted-foreground hover:bg-primary/10 hover:text-foreground",
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
