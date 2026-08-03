"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Layers3 } from "lucide-react";

import type { GameCategory } from "@/features/gamification/types";

export function CategoryCard({ category, index }: { category: GameCategory; index: number }) {
  const Icon = category.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.045, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -6, scale: 1.012 }}
      whileTap={{ scale: 0.985 }}
      className="h-full"
    >
      <Link
        href={`/games/${category.slug}`}
        className="game-surface block h-full bg-background/58 p-4 text-foreground outline-none transition-all duration-300 hover:bg-muted/62 focus-visible:ring-2 focus-visible:ring-primary/45 md:p-5"
      >
        <div
          className="grid h-14 w-14 place-items-center rounded-control"
          style={{ backgroundColor: `color-mix(in srgb, ${category.secondaryColor} 16%, white)`, color: category.secondaryColor }}
        >
          <Icon className="h-7 w-7" aria-hidden="true" />
        </div>

        <div className="mt-5 md:mt-6">
          <div className="game-chip mb-2 inline-flex items-center gap-2 bg-card/80 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <Layers3 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {category.gameCount} jogos
          </div>
          <h2 className="text-xl font-semibold tracking-normal text-foreground">{category.name}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground md:min-h-[3rem]">{category.description}</p>
        </div>

        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between gap-3 text-xs font-semibold">
            <span className="text-muted-foreground">{category.masteryLevel}</span>
            <span style={{ color: category.secondaryColor }}>{category.progress}% dominado</span>
          </div>
          <div className="h-2 overflow-hidden rounded-md border border-border bg-muted/70">
            <div
              className="h-full rounded-md transition-all duration-500 ease-out"
              style={{ width: `${Math.max(0, Math.min(100, category.progress))}%`, backgroundColor: category.secondaryColor }}
            />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
