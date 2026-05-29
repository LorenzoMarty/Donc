"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Layers3 } from "lucide-react";

import type { GameCategory } from "@/features/gamification/types";
import { Progress } from "@/components/ui/progress";

export function CategoryCard({ category, index }: { category: GameCategory; index: number }) {
  const Icon = category.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.045, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -6, scale: 1.012 }}
      whileTap={{ scale: 0.985 }}
      className="group h-full"
    >
      <Link
        href={`/games/${category.slug}`}
        className="game-tile relative block h-full overflow-hidden bg-background/58 p-4 text-foreground outline-none transition-all duration-300 hover:bg-muted/62 focus-visible:ring-2 focus-visible:ring-primary/45 md:p-5"
      >
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-25 blur-3xl transition-opacity duration-300 group-hover:opacity-45"
          style={{ background: category.secondaryColor }}
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-primary/45 opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden="true" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,.08)]">
            <Icon className="h-7 w-7" aria-hidden="true" />
          </div>
          <div className="grid h-9 w-9 place-items-center rounded-md border border-border bg-card text-muted-foreground transition-all duration-300 group-hover:border-primary/35 group-hover:text-primary">
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>

        <div className="relative mt-5 md:mt-6">
          <div className="game-chip mb-2 inline-flex items-center gap-2 bg-card/80 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <Layers3 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {category.gameCount} jogos
          </div>
          <h2 className="text-xl font-semibold tracking-normal text-foreground">{category.name}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground md:min-h-[3rem]">{category.description}</p>
        </div>

        <div className="relative mt-6 space-y-2">
          <div className="flex items-center justify-between gap-3 text-xs font-semibold">
            <span className="text-muted-foreground">{category.masteryLevel}</span>
            <span className="text-primary">{category.progress}% dominado</span>
          </div>
          <Progress value={category.progress} className="h-2" />
        </div>
      </Link>
    </motion.div>
  );
}
