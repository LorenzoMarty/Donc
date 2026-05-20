"use client";

import { motion } from "framer-motion";

import { cn } from "@/utils";

export function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5, delay, ease: "easeOut" }} className={className}>
      {children}
    </motion.div>
  );
}

export function AceternityGrid({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("game-surface relative overflow-hidden bg-card", className)}>
      <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(31,37,50,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(31,37,50,.06)_1px,transparent_1px)] [background-size:36px_36px]" />
      <div className="relative">{children}</div>
    </section>
  );
}

export function HoverGlowCard({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.42, delay, ease: "easeOut" }}
      whileHover={{ y: -6 }}
      className={cn(
        "game-tile group relative overflow-hidden bg-card p-5 transition-colors hover:bg-primary/10",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

export function MovingBorderPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("game-surface bg-card", className)}>
      <div>{children}</div>
    </div>
  );
}

export function MetricRail({ items }: { items: { value: string; label: string }[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {items.map((item, index) => (
        <Reveal key={item.label} delay={index * 0.05} className="game-tile bg-card p-4 text-center md:text-left">
          <p className="text-4xl font-semibold tracking-normal text-foreground">{item.value}</p>
          <p className="mt-2 text-sm font-medium text-muted-foreground">{item.label}</p>
        </Reveal>
      ))}
    </div>
  );
}
