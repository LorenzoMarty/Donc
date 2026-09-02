"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

import { cn } from "@/utils";

export function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? undefined : { opacity: 0, y: 18 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function AceternityGrid({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("marketing-surface relative overflow-hidden rounded-[22px]", className)}>
      <div className="relative">{children}</div>
    </section>
  );
}

export function HoverGlowCard({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.42, delay, ease: "easeOut" }}
      whileHover={reduceMotion ? undefined : { y: -6 }}
      className={cn("marketing-card group relative overflow-hidden rounded-[14px] p-5", className)}
    >
      {children}
    </motion.div>
  );
}

export function MovingBorderPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("marketing-surface rounded-[18px]", className)}>
      <div>{children}</div>
    </div>
  );
}

export function MetricRail({ items }: { items: { value: string; label: string }[] }) {
  return (
    <div className="fluid-grid gap-3 [--grid-min:12rem]">
      {items.map((item, index) => (
        <Reveal key={item.label} delay={index * 0.05} className="marketing-card rounded-[14px] p-4 text-center md:text-left">
          <p className="font-display text-4xl font-semibold tabular-nums tracking-normal text-foreground">{item.value}</p>
          <p className="mt-2 text-sm font-medium text-muted-foreground">{item.label}</p>
        </Reveal>
      ))}
    </div>
  );
}

/**
 * Elemento de assinatura do marketing: a nota ENEM (0-1000) contando ao vivo até um valor-alvo,
 * com as 5 competências preenchendo em sequência — o artefato que todo aluno de ENEM reconhece
 * de cabeça, não um mock genérico de "dashboard de produto".
 */
const COMPETENCIES = [
  { id: "C1", label: "Norma culta", value: 180 },
  { id: "C2", label: "Compreensão do tema", value: 200 },
  { id: "C3", label: "Argumentação", value: 180 },
  { id: "C4", label: "Coesão textual", value: 180 },
  { id: "C5", label: "Proposta de intervenção", value: 180 },
] as const;

const TARGET_SCORE = COMPETENCIES.reduce((sum, c) => sum + c.value, 0);

export function ScoreCounter({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduceMotion = useReducedMotion();
  const [displayScore, setDisplayScore] = useState(reduceMotion ? TARGET_SCORE : 0);
  const motionScore = useMotionValue(0);
  const springScore = useSpring(motionScore, { stiffness: 60, damping: 20 });

  useEffect(() => {
    if (!reduceMotion && inView) {
      motionScore.set(TARGET_SCORE);
    }
  }, [inView, motionScore, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return undefined;
    const unsubscribe = springScore.on("change", (latest) => setDisplayScore(Math.round(latest)));
    return unsubscribe;
  }, [springScore, reduceMotion]);

  return (
    <div ref={ref} className={cn("marketing-surface rounded-[18px] p-5 text-foreground md:p-6", className)}>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Nota estimada</p>
          <p className="font-display text-6xl font-semibold leading-none tabular-nums tracking-tight text-foreground md:text-7xl">
            {displayScore}
          </p>
        </div>
        <span className="game-chip mb-1 bg-primary/12 px-3 py-1 text-xs font-semibold text-primary">de 1000</span>
      </div>

      <div className="space-y-3">
        {COMPETENCIES.map((competency, index) => (
          <CompetencyBar key={competency.id} competency={competency} index={index} active={inView || Boolean(reduceMotion)} />
        ))}
      </div>
    </div>
  );
}

function CompetencyBar({
  competency,
  index,
  active,
}: {
  competency: (typeof COMPETENCIES)[number];
  index: number;
  active: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const pct = (competency.value / 200) * 100;

  return (
    <div className="flex items-center gap-3">
      <span className="game-chip w-9 shrink-0 py-1 text-center text-[11px] font-semibold text-muted-foreground">{competency.id}</span>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
          <span className="truncate">{competency.label}</span>
          <span className="tabular-nums">{competency.value}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={reduceMotion ? { width: `${pct}%` } : { width: 0 }}
            animate={{ width: active ? `${pct}%` : reduceMotion ? `${pct}%` : 0 }}
            transition={{ duration: 0.5, delay: reduceMotion ? 0 : 0.15 + index * 0.08, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}
