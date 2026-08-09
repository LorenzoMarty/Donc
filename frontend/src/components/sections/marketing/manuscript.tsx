"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/utils";

/**
 * Sistema visual próprio das páginas de marketing — deliberadamente distinto dos componentes do
 * dashboard (`game-tile`/`game-chip`/`game-surface`/`HoverGlowCard`). Metáfora: uma redação real
 * sendo diagnosticada, como a correção que o produto de fato faz — não um dashboard de SaaS
 * genérico. Reaproveita só tokens de cor/tipografia do design system, nunca a forma dos
 * componentes do app logado.
 */

export function FadeIn({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? undefined : { opacity: 0, y: 14 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

type Annotation = {
  phrase: string;
  hubLabel: string;
  color: string;
};

/**
 * Elemento de assinatura: um trecho real de redação nota-baixa, com frases sublinhadas na cor de
 * cada hub de diagnóstico real do produto — literaliza "a gente lê sua redação como a banca lê"
 * em vez de mostrar um screenshot de dashboard.
 */
export function AnnotatedManuscript({
  intro,
  segments,
  className,
}: {
  intro: string;
  segments: (string | Annotation)[];
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduceMotion = useReducedMotion();
  const annotationOrder = segments.reduce<number[]>((acc, segment, i) => {
    acc[i] = typeof segment === "string" ? -1 : acc.filter((v) => v >= 0).length;
    return acc;
  }, []);

  return (
    <div ref={ref} className={cn("manuscript-paper relative rounded-[4px] bg-card p-6 shadow-[0_1px_0_rgba(0,0,0,0.04)] sm:p-8", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Trecho corrigido pela IA</p>
      <p className="font-essay mt-4 text-lg leading-9 text-foreground sm:text-xl">
        {intro}{" "}
        {segments.map((segment, index) => {
          if (typeof segment === "string") return <span key={index}>{segment} </span>;

          const currentIndex = annotationOrder[index];

          return (
            <span key={index}>
              <span
                className="underline decoration-2 underline-offset-4"
                style={{ textDecorationColor: segment.color }}
              >
                {segment.phrase}
              </span>{" "}
              <motion.span
                initial={reduceMotion ? undefined : { opacity: 0, y: -4 }}
                animate={reduceMotion ? undefined : inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.35, delay: 0.5 + currentIndex * 0.25, ease: "easeOut" }}
                className="mx-0.5 inline-flex -translate-y-0.5 items-center gap-1 rounded-full px-2 py-0.5 align-middle text-[11px] font-semibold"
                style={{ backgroundColor: `color-mix(in srgb, ${segment.color} 14%, transparent)`, color: segment.color }}
              >
                {segment.hubLabel}
              </motion.span>{" "}
            </span>
          );
        })}
      </p>
    </div>
  );
}

/**
 * Nota tipo "recado preso no mural" — cada um dos 7 hubs de diagnóstico reais do produto,
 * levemente rotacionado, cor real do hub como fita no topo. Não é um card de feature genérico.
 */
export function HubTag({
  title,
  description,
  icon: Icon,
  color,
  rotation,
  className,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  rotation: number;
  className?: string;
}) {
  return (
    <div
      className={cn("group relative w-full max-w-[15rem] rounded-[3px] bg-card p-4 shadow-[0_3px_10px_rgba(20,20,20,0.09)] transition-transform duration-200 hover:-translate-y-1 hover:rotate-0", className)}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <span
        aria-hidden="true"
        className="absolute -top-2 left-1/2 h-4 w-9 -translate-x-1/2 rounded-[2px] opacity-90"
        style={{ backgroundColor: color }}
      />
      <Icon className="h-5 w-5" style={{ color }} aria-hidden="true" />
      <p className="mt-3 text-sm font-semibold leading-snug text-foreground">{title}</p>
      <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}

/**
 * "Boletim" de nota — recibo/ticket com talão picotado, não um card branco arredondado igual ao
 * resto do produto. Nota ENEM (0-1000) contando ao vivo + 5 competências.
 */
const COMPETENCIES = [
  { id: "C1", label: "Norma culta", value: 180 },
  { id: "C2", label: "Compreensão do tema", value: 200 },
  { id: "C3", label: "Argumentação", value: 180 },
  { id: "C4", label: "Coesão textual", value: 180 },
  { id: "C5", label: "Proposta de intervenção", value: 180 },
] as const;

const TARGET_SCORE = COMPETENCIES.reduce((sum, c) => sum + c.value, 0);

export function ReportSlip({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduceMotion = useReducedMotion();

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div className="rounded-t-[10px] bg-foreground px-6 py-3 text-background">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Boletim · Donc ENEM</p>
      </div>
      <div className="relative border-x border-b border-border bg-card px-6 pb-6 pt-5 shadow-[0_10px_30px_rgba(20,20,20,0.08)]">
        <span aria-hidden="true" className="absolute -left-2.5 top-0 h-5 w-5 -translate-y-1/2 rounded-full bg-background" />
        <span aria-hidden="true" className="absolute -right-2.5 top-0 h-5 w-5 -translate-y-1/2 rounded-full bg-background" />
        <div className="border-b border-dashed border-border pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Nota estimada</p>
          <p className="font-display mt-1 text-6xl font-semibold leading-none tabular-nums tracking-tight text-foreground">
            {reduceMotion ? TARGET_SCORE : <AnimatedNumber active={inView} target={TARGET_SCORE} />}
            <span className="ml-2 text-base font-medium text-muted-foreground">/1000</span>
          </p>
        </div>
        <div className="mt-4 space-y-3">
          {COMPETENCIES.map((competency, index) => (
            <div key={competency.id} className="flex items-center gap-3">
              <span className="w-8 shrink-0 text-center text-[11px] font-semibold text-muted-foreground">{competency.id}</span>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
                  <span className="truncate">{competency.label}</span>
                  <span className="tabular-nums">{competency.value}</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={reduceMotion ? { width: `${(competency.value / 200) * 100}%` } : { width: 0 }}
                    animate={{ width: inView || reduceMotion ? `${(competency.value / 200) * 100}%` : 0 }}
                    transition={{ duration: 0.5, delay: reduceMotion ? 0 : 0.1 + index * 0.08, ease: "easeOut" }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AnimatedNumber({ active, target }: { active: boolean; target: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  return (
    <motion.span
      ref={ref}
      initial={{ "--num": 0 } as never}
      animate={active ? ({ "--num": target } as never) : undefined}
      transition={{ duration: 1.1, ease: "easeOut" }}
      onUpdate={(latest) => {
        const value = (latest as { "--num"?: number })["--num"];
        if (ref.current && typeof value === "number") ref.current.textContent = String(Math.round(value));
      }}
    >
      0
    </motion.span>
  );
}

/**
 * Citação editorial — uma só, grande, sem moldura de card. Marcada com proveniência discreta
 * (não é depoimento real, Donc está em pré-lançamento).
 */
export function PullQuote({
  quote,
  name,
  role,
  className,
}: {
  quote: string;
  name: string;
  role: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <span aria-hidden="true" className="font-display absolute -left-1 -top-6 text-8xl leading-none text-primary/20 sm:-top-8">
        &ldquo;
      </span>
      <blockquote className="font-display relative text-2xl font-medium leading-snug tracking-tight text-foreground sm:text-3xl">
        {quote}
      </blockquote>
      <footer className="mt-5 flex items-center gap-3">
        <div className="h-10 w-10 shrink-0 rounded-full bg-primary/15" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground">{role} · cenário ilustrativo</p>
        </div>
      </footer>
    </div>
  );
}
