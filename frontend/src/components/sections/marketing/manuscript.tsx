"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
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
    <div
      ref={ref}
      className={cn(
        "manuscript-paper marketing-surface relative rounded-[18px] p-5 sm:p-7 lg:p-8",
        className,
      )}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--neutral-600))]">Trecho corrigido pela IA</p>
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
      className={cn(
        "marketing-card group relative w-full max-w-[15rem] rounded-[10px] p-4 transition-transform duration-200 hover:-translate-y-1 hover:rotate-0",
        className,
      )}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <span
        aria-hidden="true"
        className="absolute -top-2 left-1/2 h-4 w-9 -translate-x-1/2 rounded-[2px] opacity-90"
        style={{ backgroundColor: color }}
      />
      <Icon className="h-5 w-5" style={{ color }} aria-hidden="true" />
      <p className="mt-3 text-sm font-semibold leading-snug text-foreground">{title}</p>
      <p className="marketing-copy mt-1.5 text-xs leading-5">{description}</p>
    </div>
  );
}

/**
 * Selo do hero — pill com ícone, mesmo tratamento de cor accent-12/accent-strong dos hubs.
 */
export function HeroBadge({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3.5 py-1.5 text-[13px] font-bold text-[hsl(var(--green-700))]">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {children}
    </span>
  );
}

/**
 * Faixa de números do hero. ATENÇÃO: valores atuais em landing-page.tsx são placeholder de
 * exemplo (produto em pré-lançamento, sem base de alunos real ainda) — trocar por métrica real
 * antes do lançamento.
 */
export function FactRow({ facts }: { facts: { value: string; label: string }[] }) {
  return (
    <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
      {facts.map((fact, index) => (
        <div key={fact.label} className="flex items-center gap-6">
          {index > 0 && <span className="hidden h-8 w-px bg-border sm:block" aria-hidden="true" />}
          <div>
            <p className="font-display text-xl font-semibold text-foreground">{fact.value}</p>
      <p className="text-xs font-medium text-[hsl(var(--neutral-600))]">{fact.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Passo do "como funciona" — círculo numerado sobre ícone, mesma lógica de card papel leve dos
 * hubs, sem rotação (sequência linear, não mural).
 */
export function ProcessStep({
  number,
  title,
  description,
  icon: Icon,
}: {
  number: number;
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="text-center">
      <div className="marketing-icon relative mx-auto mb-4 h-16 w-16">
        <Icon className="h-7 w-7 text-primary" aria-hidden="true" />
        <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {number}
        </span>
      </div>
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="marketing-copy mx-auto mt-1.5 max-w-[15rem] text-sm">{description}</p>
    </div>
  );
}

/**
 * Card de recurso — mesmo tratamento "recado no mural" do HubTag mas sem rotação (grid regular,
 * não mural). Variante `featured` reaproveita o escuro do ReportSlip/CTA final pra destacar um item.
 */
export function FeatureCard({
  title,
  description,
  icon: Icon,
  featured = false,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  featured?: boolean;
}) {
  return (
    <div className={cn("marketing-card rounded-[14px] p-6", featured && "border-primary/30 ring-1 ring-primary/15")}>
      <div className="marketing-icon">
        <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
      </div>
      <p className="mt-4 text-base font-semibold text-foreground">{title}</p>
      <p className="marketing-copy mt-1.5 text-sm">{description}</p>
    </div>
  );
}

/**
 * Card de depoimento — versão em grid do PullQuote, mesma proveniência "cenário ilustrativo"
 * (produto em pré-lançamento, sem base de alunos real ainda).
 */
export function TestimonialCard({ quote, name, role }: { quote: string; name: string; role: string }) {
  return (
    <div className="marketing-card rounded-[14px] p-6">
      <p className="text-sm leading-7 text-foreground">&ldquo;{quote}&rdquo;</p>
      <footer className="mt-5 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary" aria-hidden="true">
          {name
            .split(" ")
            .map((part) => part[0])
            .slice(0, 2)
            .join("")}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{name}</p>
          <p className="text-xs font-medium text-[hsl(var(--neutral-600))]">{role} · cenário ilustrativo</p>
        </div>
      </footer>
    </div>
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
          <p className="text-xs font-medium text-[hsl(var(--neutral-600))]">{role} · cenário ilustrativo</p>
        </div>
      </footer>
    </div>
  );
}

/**
 * Faixa de logos em marquee (auto-scroll infinito, pausa no hover). ATENÇÃO: lista de instituições
 * em landing-page.tsx é placeholder de exemplo — trocar por parceiros/aprovações reais antes do
 * lançamento.
 */
export function LogoMarquee({ names, caption }: { names: string[]; caption: string }) {
  const track = [...names, ...names];
  return (
    <div>
      <p className="mb-5 text-center text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--neutral-600))]">{caption}</p>
      <div className="group relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        <div className="flex w-max animate-[marquee_32s_linear_infinite] items-center gap-14 group-hover:[animation-play-state:paused]">
          {track.map((name, index) => (
            <span key={`${name}-${index}`} className="font-display shrink-0 whitespace-nowrap text-xl font-medium text-muted-foreground/70">
              {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Card de plano — preview dos planos reais de `/pricing` (fonte única em
 * `features/marketing/pricing-plans.ts`). Destaque do plano `featured` só com borda/ring accent,
 * nunca fundo escuro isolado (ver landing-page.tsx: home sempre em tema claro).
 */
export function PlanCard({
  name,
  price,
  period = "/mês",
  description,
  features,
  featured,
}: {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: readonly string[];
  featured: boolean;
}) {
  return (
    <div
      className={cn("marketing-card relative rounded-[16px] p-6 sm:p-7", featured && "border-primary/40 ring-1 ring-primary/20")}
    >
      {featured && (
        <span className="absolute right-6 top-6 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
          Mais popular
        </span>
      )}
      <p className="text-base font-semibold text-foreground">{name}</p>
      <p className="marketing-copy mt-1 text-sm">{description}</p>
      <p className="font-display mt-5 text-4xl font-semibold tracking-tight text-foreground">
        {price}
        <span className="ml-1 text-sm font-semibold text-[hsl(var(--neutral-600))]">{period}</span>
      </p>
      <Button asChild className="mt-6 w-full" variant={featured ? "default" : "outline"}>
        <Link href="/cadastro">Escolher {name}</Link>
      </Button>
      <div className="mt-6 space-y-2.5 border-t border-dashed border-border pt-5">
        {features.map((feature) => (
          <div key={feature} className="flex items-start gap-2.5 text-sm text-foreground">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>{feature}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
