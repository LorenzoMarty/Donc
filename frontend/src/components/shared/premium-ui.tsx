"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { BookOpenCheck } from "lucide-react";

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
      className="game-surface relative min-w-0 overflow-hidden bg-card p-4 xs:p-5 lg:p-6"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/55 to-transparent" aria-hidden="true" />
      <div className="relative flex flex-col justify-between gap-4 lg:flex-row lg:items-start lg:gap-5">
        <div className="min-w-0">
          <div className="game-chip mb-4 inline-flex items-center gap-2 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-secondary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
            {eyebrow}
          </div>
          <div className="flex items-start gap-3">
            <div className="hidden h-10 w-10 shrink-0 place-items-center rounded-md border border-primary/20 bg-primary/10 text-secondary sm:grid">
              <BookOpenCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold leading-tight tracking-normal sm:text-3xl lg:text-[2.15rem]">
                {title}
              </h1>
              {description && (
                <p className="mt-3 max-w-[82ch] text-sm font-medium leading-6 text-muted-foreground md:text-base">{description}</p>
              )}
            </div>
          </div>
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
      whileHover={{ y: -1 }}
      transition={{ duration: 0.24, delay, ease: "easeOut" }}
      className={cn(
        "min-w-0",
        solidPrimary ? "game-surface bg-primary p-4 text-primary-foreground xs:p-5 lg:p-6" : "game-surface bg-card p-3 xs:p-4 lg:p-5",
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
