"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Surface } from "@/components/shared/premium-ui";
import { masteryForHub } from "@/features/gamification/adaptive";
import { symptomHubs } from "@/features/gamification/symptoms";
import { useGameStore } from "@/stores/game-store";

export function HubMastery() {
  const adaptive = useGameStore((state) => state.adaptive);

  return (
    <Surface>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Treino cognitivo</p>
        <h2 className="mt-1 text-xl font-semibold tracking-normal">Os 7 sintomas da sua escrita</h2>
        <p className="mt-1 text-sm text-muted-foreground">Toque no hub com nota mais baixa para treinar o que está te travando.</p>
      </div>
      <div className="mt-4 fluid-grid gap-3 [--grid-min:15rem]">
        {symptomHubs.map((hub) => {
          const HubIcon = hub.icon;
          const mastery = masteryForHub(adaptive, hub.id);
          return (
            <Link
              key={hub.id}
              href={`/games/treino/${hub.id}`}
              className="game-tile group flex flex-col gap-2 bg-background/64 p-4 transition-colors hover:border-primary/50 hover:bg-primary/5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="grid h-10 w-10 place-items-center rounded-md border border-primary/25 bg-primary/12 text-primary">
                  <HubIcon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="rounded-full border border-border bg-card px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                  {mastery}/100
                </span>
              </div>
              <h3 className="text-sm font-semibold leading-snug tracking-normal text-foreground">{hub.label}</h3>
              <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-primary">
                Treinar
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </Link>
          );
        })}
      </div>
    </Surface>
  );
}
