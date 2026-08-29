"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, PenLine, TrendingUp, TriangleAlert } from "lucide-react";

import type { Essay } from "@/services/api";
import { cn } from "@/utils";

/**
 * Tela de resumo da correção (fiel a Resultado.dc.html) — passo intermediário antes do workspace
 * de anotação in-line (`EssayAnalysisWorkspace`), que continua existindo e é aberto via o botão
 * "Ver análise no texto".
 */
export function EssayResultado({ essay, onViewAnalysis, onRewrite }: { essay: Essay; onViewAnalysis: () => void; onRewrite: () => void }) {
  const correction = essay.correction;
  if (!correction) return null;

  const competencies = [
    { code: "C1", label: "Norma culta", value: correction.competency_1 },
    { code: "C2", label: "Compreensão do tema", value: correction.competency_2 },
    { code: "C3", label: "Argumentação", value: correction.competency_3 },
    { code: "C4", label: "Coesão textual", value: correction.competency_4 },
    { code: "C5", label: "Proposta de intervenção", value: correction.competency_5 },
  ];

  const circumference = 2 * Math.PI * 88;
  const ringOffset = circumference * (1 - correction.total_score / 1000);

  return (
    <div className="mx-auto max-w-[1080px]">
      <Link href="/redacoes" className="mb-3.5 inline-flex items-center gap-1.5 text-[14px] text-muted-foreground hover:text-foreground">
        <ArrowRight className="h-4 w-4 rotate-180" aria-hidden="true" />
        Minhas redações
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 max-w-[640px]">
          <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-primary">Correção concluída</p>
          <h1 className="font-display mt-1 text-[30px] font-medium leading-tight">{essay.title}</h1>
          <p className="mt-2 text-[13px] text-muted-foreground">
            Corrigida {formatDate(correction.created_at)} · {essay.word_count} palavras · modelo ENEM
          </p>
        </div>
        <div className="flex shrink-0 gap-2.5">
          <button
            type="button"
            onClick={onRewrite}
            className="flex items-center gap-2 rounded-control border border-border bg-card px-4 py-2.5 text-[14px] font-semibold text-foreground/80"
          >
            <PenLine className="h-[15px] w-[15px]" aria-hidden="true" />
            Reescrever
          </button>
          <button
            type="button"
            onClick={onViewAnalysis}
            className="flex items-center gap-2 rounded-control bg-primary px-[18px] py-2.5 text-[14px] font-semibold text-primary-foreground shadow-control"
          >
            Ver análise no texto
            <ArrowRight className="h-[15px] w-[15px]" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="flex flex-col items-center justify-center rounded-card bg-card p-7 shadow-soft">
          <div className="relative h-[200px] w-[200px]">
            <svg width="200" height="200" viewBox="0 0 200 200" className="-rotate-90">
              <circle cx="100" cy="100" r="88" fill="none" stroke="hsl(var(--muted-foreground) / 0.14)" strokeWidth="16" />
              <circle
                cx="100"
                cy="100"
                r="88"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={ringOffset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-[52px] font-medium leading-none tracking-tight tabular-nums">{correction.total_score}</span>
              <span className="mt-0.5 text-[14px] text-muted-foreground">de 1000</span>
            </div>
          </div>
          <div className="mt-4.5 flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-[14px] font-semibold text-primary">
            <TrendingUp className="h-[15px] w-[15px]" aria-hidden="true" />
            Nota registrada
          </div>
          <p className="mt-3.5 text-center text-[13px] leading-relaxed text-muted-foreground">{correction.feedback}</p>
        </div>

        <div className="rounded-card bg-card p-7 shadow-soft">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-[17px] font-semibold">Notas por competência</h2>
            <span className="text-[13px] text-muted-foreground">ENEM · C1 a C5</span>
          </div>
          {competencies.map((item) => (
            <div key={item.code} className="mb-4.5 last:mb-0">
              <div className="mb-2 flex items-baseline justify-between">
                <div>
                  <span className="text-[14px] font-semibold">{item.code}</span>
                  <span className="ml-2 text-[14px] text-foreground/70">{item.label}</span>
                </div>
                <div className="text-[15px] font-bold tabular-nums">
                  {item.value}
                  <span className="text-[12px] font-medium text-muted-foreground">/200</span>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(item.value / 200) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-card bg-card p-7 shadow-soft">
        <h2 className="mb-4.5 text-[17px] font-semibold">Feedback do corretor</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.04em] text-primary">
              <CheckCircle2 className="h-[15px] w-[15px]" aria-hidden="true" />
              Pontos fortes
            </div>
            {correction.strengths.map((item, index) => (
              <FeedbackItem key={index} text={item} tone="text-primary" />
            ))}
          </div>
          <div>
            <div className="mb-3 flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.04em] text-streak">
              <TriangleAlert className="h-[15px] w-[15px]" aria-hidden="true" />
              Para melhorar
            </div>
            {correction.errors.map((item, index) => (
              <FeedbackItem key={index} text={item} tone="text-streak" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeedbackItem({ text, tone }: { text: string; tone: string }) {
  return (
    <div className="mb-3 flex gap-2.5 last:mb-0">
      <span className={cn("mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current", tone)} aria-hidden="true" />
      <span className="text-[14px] leading-relaxed text-foreground/85">{text}</span>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" }).format(new Date(value));
}
