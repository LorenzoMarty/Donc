"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="min-w-0 border-b border-border/80 bg-transparent pb-3"
    >
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start lg:gap-4">
        <div className="min-w-0">
          <div className="game-chip mb-1.5 inline-flex items-center border-primary/15 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            {eyebrow}
          </div>
          <h1 className="text-xl font-semibold leading-tight tracking-normal sm:text-2xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 max-w-[82ch] text-sm font-medium leading-5 text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div className="w-full min-w-0 shrink-0 lg:w-auto">{action}</div>}
      </div>
    </motion.div>
  );
}

export function Surface({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const solidPrimary = className?.split(/\s+/).includes("bg-primary");

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, delay, ease: "easeOut" }}
      className={cn(
        "min-w-0",
        solidPrimary ? "game-surface bg-primary p-5 text-primary-foreground lg:p-6" : "game-surface bg-card p-5 lg:p-6",
        className,
      )}
    >
      {children}
    </motion.section>
  );
}

export function CompetencyMeter({ label, value }: { label: string; value: number }) {
  return (
    <div className="game-tile bg-background/56 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-safe text-xs font-semibold text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold">{value}</span>
      </div>
      <Progress value={(value / 200) * 100} className="h-2" />
    </div>
  );
}
