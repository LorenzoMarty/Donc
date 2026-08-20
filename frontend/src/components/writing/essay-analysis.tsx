"use client";

import { useState } from "react";
import { AlertCircle, BarChart3, Check, Download, Link2, MoreHorizontal, Share2, WandSparkles, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TooltipContent, TooltipRoot, TooltipTrigger } from "@/components/ui/tooltip";
import { countWords } from "@/hooks/useEssayDraft";
import type { Essay, EssayTheme } from "@/services/api";
import type { InlineAnnotation } from "@/types/api";
import { cn } from "@/utils";

function splitParagraphs(content: string): string[] {
  const stripped = content.trim();
  if (!stripped) return [];
  if (/\n\s*\n/.test(stripped)) return stripped.split(/\n\s*\n+/).filter((p) => p.trim());
  return stripped.split(/\n+/).filter((l) => l.trim());
}

type TextSegment = { text: string; annotation?: InlineAnnotation; index: number };

function buildSegments(paragraph: string, annotations: InlineAnnotation[]): TextSegment[] {
  const ranges: { start: number; end: number; annotation: InlineAnnotation }[] = [];
  for (const annotation of annotations) {
    const range = findQuoteRange(paragraph, annotation.quote);
    if (!range) continue;
    const overlaps = ranges.some((r) => !(range.end <= r.start || range.start >= r.end));
    if (!overlaps) ranges.push({ start: range.start, end: range.end, annotation });
  }
  ranges.sort((a, b) => a.start - b.start);

  const segments: TextSegment[] = [];
  let cursor = 0;
  let segIdx = 0;
  for (const { start, end, annotation } of ranges) {
    if (start > cursor) segments.push({ text: paragraph.slice(cursor, start), index: segIdx++ });
    segments.push({ text: paragraph.slice(start, end), annotation, index: segIdx++ });
    cursor = end;
  }
  if (cursor < paragraph.length) segments.push({ text: paragraph.slice(cursor), index: segIdx++ });
  return segments;
}

function findQuoteRange(paragraph: string, quote: string) {
  const exact = paragraph.indexOf(quote);
  if (exact !== -1) return { start: exact, end: exact + quote.length };
  const trimmed = quote.trim();
  const trimmedExact = paragraph.indexOf(trimmed);
  if (trimmedExact !== -1) return { start: trimmedExact, end: trimmedExact + trimmed.length };
  const pattern = trimmed.split(/\s+/).map(escapeRegExp).join("\\s+");
  const match = new RegExp(pattern, "i").exec(paragraph);
  return match?.index === undefined ? null : { start: match.index, end: match.index + match[0].length };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function annotationKey(annotation: InlineAnnotation) {
  return `${annotation.paragraph_index}:${annotation.competency}:${annotation.type}:${annotation.quote}:${annotation.comment}`;
}

function annotationNumber(annotations: InlineAnnotation[], annotation: InlineAnnotation) {
  const key = annotationKey(annotation);
  const index = annotations.findIndex((item) => annotationKey(item) === key);
  return index === -1 ? 0 : index + 1;
}

export function EssayAnalysisWorkspace({
  title,
  content,
  theme,
  correction,
  error,
}: {
  title: string;
  content: string;
  theme: EssayTheme | null;
  correction: Essay["correction"];
  error: string;
}) {
  const [activeAnnotationKey, setActiveAnnotationKey] = useState<string | null>(null);
  const annotations = correction?.inline_annotations ?? [];
  const activeAnnotation = annotations.find((annotation) => annotationKey(annotation) === activeAnnotationKey) ?? null;
  const words = countWords(content);
  const selectAnnotation = (annotation: InlineAnnotation | null) => setActiveAnnotationKey(annotation ? annotationKey(annotation) : null);

  async function shareEssay() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title, text: theme?.title ?? title, url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard?.writeText(url);
  }

  function exportEssay() {
    const lines = [
      title,
      "",
      theme ? `Tema: ${theme.title}` : "",
      correction ? `Nota: ${correction.total_score}` : "",
      "",
      content,
      "",
      "Comentarios da IA",
      ...(correction?.suggestions ?? []).map((item, index) => `${index + 1}. ${item}`),
    ].filter(Boolean);
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slugify(title)}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid h-[calc(100dvh-8.75rem)] min-h-[620px] grid-rows-[minmax(0,1fr)_minmax(19rem,42dvh)] overflow-hidden rounded-md border border-border bg-card md:h-dvh md:rounded-none md:border-0 lg:grid-cols-[minmax(0,1fr)_minmax(23rem,30rem)] lg:grid-rows-none">
      <div className="flex min-h-0 flex-col">
        <header className="flex flex-col gap-3 border-b border-border bg-card px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-safe text-lg font-medium leading-tight text-foreground lg:text-xl">{title}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 font-medium text-accent">
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Salvo
                </span>
                <span>
                  <strong className="text-foreground">{words.toLocaleString("pt-BR")}</strong> palavras
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={shareEssay}>
              <Share2 className="h-4 w-4" aria-hidden="true" />
              Compartilhar
            </Button>
            <Button onClick={exportEssay}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Exportar
            </Button>
          </div>
        </header>

        <EssayDocumentPanel
          title={title}
          content={content}
          annotations={annotations}
          activeAnnotation={activeAnnotation}
          onSelectAnnotation={selectAnnotation}
        />
      </div>
      <AIFeedbackPanel
        correction={correction}
        error={error}
        annotations={annotations}
        activeAnnotation={activeAnnotation}
        onSelectAnnotation={selectAnnotation}
      />
    </div>
  );
}

function EssayDocumentPanel({
  title,
  content,
  annotations,
  activeAnnotation,
  onSelectAnnotation,
}: {
  title: string;
  content: string;
  annotations: InlineAnnotation[];
  activeAnnotation: InlineAnnotation | null;
  onSelectAnnotation: (annotation: InlineAnnotation | null) => void;
}) {
  const paragraphs = splitParagraphs(content);
  const annotationsByParagraph = (pIndex: number) => annotations.filter((a) => a.paragraph_index === pIndex);

  return (
    <article className="mobile-scroll min-h-0 flex-1 overflow-y-auto bg-card px-5 py-8 md:px-10 lg:px-12">
      <div className="mx-auto max-w-[860px]">
        <h2 className="text-safe text-4xl font-bold leading-tight tracking-normal text-foreground md:text-5xl [font-family:var(--font-merriweather,Georgia,serif)]">
          {title}
        </h2>

        <div className="mt-8 space-y-8 text-[1.28rem] leading-[2.05] text-foreground [font-family:var(--font-merriweather,Georgia,serif)]">
          {paragraphs.length ? (
            paragraphs.map((paragraph, pIndex) => {
              const paragraphAnnotations = annotationsByParagraph(pIndex);
              const segments = buildSegments(paragraph, paragraphAnnotations);
              return (
                <p key={pIndex}>
                  {segments.map((seg) =>
                    seg.annotation ? (
                      <button
                        key={seg.index}
                        type="button"
                        onClick={() =>
                          onSelectAnnotation(
                            activeAnnotation && annotationKey(activeAnnotation) === annotationKey(seg.annotation!) ? null : (seg.annotation ?? null),
                          )
                        }
                        className={cn(
                          "relative rounded-sm px-1 text-left underline decoration-2 underline-offset-[6px] transition-colors",
                          annotationTone(seg.annotation).mark,
                          activeAnnotation && annotationKey(activeAnnotation) === annotationKey(seg.annotation!) && "ring-2 ring-primary/45",
                        )}
                      >
                        {seg.text}
                        <span className={cn("ml-1 inline-grid h-5 min-w-5 translate-y-[-3px] place-items-center rounded-full px-1 align-middle text-[0.62rem] font-bold leading-none no-underline", annotationTone(seg.annotation).number)}>
                          {annotationNumber(annotations, seg.annotation)}
                        </span>
                      </button>
                    ) : (
                      <span key={seg.index}>{seg.text}</span>
                    ),
                  )}
                </p>
              );
            })
          ) : (
            <p className="whitespace-pre-wrap">{content}</p>
          )}
        </div>
      </div>
    </article>
  );
}

function AIFeedbackPanel({
  correction,
  error,
  annotations,
  activeAnnotation,
  onSelectAnnotation,
}: {
  correction: Essay["correction"];
  error: string;
  annotations: InlineAnnotation[];
  activeAnnotation: InlineAnnotation | null;
  onSelectAnnotation: (annotation: InlineAnnotation | null) => void;
}) {
  const suggestions = buildSuggestionCards(correction, annotations);
  const score = correction?.total_score ?? 0;

  return (
    <aside className="mobile-scroll min-h-0 overflow-y-auto border-t border-border bg-background lg:border-l lg:border-t-0">
      <div className="sticky top-0 z-10 border-b border-border bg-background px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground">
              <WandSparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="text-xl font-semibold">IA Donc</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onSelectAnnotation(null)} aria-label="Limpar comentário selecionado">
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="space-y-5 p-5">
        {correction ? (
          <div className="grid gap-5 border-b border-border pb-5 sm:grid-cols-[7rem_1fr] sm:items-center">
            <ScoreRing score={score} />
            <div>
              <h3 className="text-lg font-semibold">
                {score >= 800 ? "Excelente redação." : score >= 600 ? "Boa base — dá para subir." : "Tem o que trabalhar aqui."}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{correction.feedback}</p>
            </div>
          </div>
        ) : (
          <div className="game-tile bg-card p-4 text-sm text-muted-foreground">
            Envie a redação para ver a nota e os comentários por competência.
          </div>
        )}

        {activeAnnotation ? (
          <div className={cn("rounded-card border p-4 shadow-soft", annotationTone(activeAnnotation).panel)}>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline">#{annotationNumber(annotations, activeAnnotation)}</Badge>
              <Badge variant={activeAnnotation.type === "error" ? "destructive" : "success"}>
                {activeAnnotation.type === "error" ? "Ajuste" : "Força"}
              </Badge>
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", annotationTone(activeAnnotation).badge)}>
                {competencyLabel(activeAnnotation.competency)}
              </span>
            </div>
            <p className="text-sm font-semibold italic text-muted-foreground">&quot;{activeAnnotation.quote}&quot;</p>
            <p className="mt-2 text-sm leading-6">{activeAnnotation.comment}</p>
          </div>
        ) : null}

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-semibold">Sugestões ({suggestions.length})</h3>
            <button type="button" onClick={() => onSelectAnnotation(null)} className="text-sm font-semibold text-primary">
              Limpar tudo
            </button>
          </div>
          <div className="space-y-3">
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={`${suggestion.index}-${suggestion.title}`}
                suggestion={suggestion}
                active={Boolean(activeAnnotation && suggestion.annotation && annotationKey(activeAnnotation) === annotationKey(suggestion.annotation))}
                onClick={() => onSelectAnnotation(suggestion.annotation ?? null)}
              />
            ))}
          </div>
        </section>

        <section className="rounded-card border border-border bg-card p-4 shadow-soft">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <BarChart3 className="h-4 w-4 text-primary" aria-hidden="true" />
            Competências
          </div>
          {correction ? (
            <div className="grid gap-2">
              {[
                ["C1", correction.competency_1],
                ["C2", correction.competency_2],
                ["C3", correction.competency_3],
                ["C4", correction.competency_4],
                ["C5", correction.competency_5],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-[2rem_1fr_3rem] items-center gap-2 text-sm">
                  <CompetencyLabel code={String(label)} />
                  <Progress
                    value={(Number(value) / 200) * 100}
                    className="h-2"
                    indicatorClassName={competencyTone(String(label)).bar}
                  />
                  <span className="text-right font-semibold">{value}</span>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        {error ? (
          <div className="game-tile flex gap-2 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </div>
        ) : null}
      </div>
    </aside>
  );
}

export function ScoreRing({ score }: { score: number }) {
  const display = Math.round(score / 10);
  const percent = Math.max(0, Math.min(1, score / 1000));
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative grid h-24 w-24 place-items-center">
      <svg viewBox="0 0 96 96" className="absolute inset-0 h-full w-full -rotate-90">
        <circle cx="48" cy="48" r={radius} className="stroke-muted" strokeWidth="8" fill="none" />
        <circle
          cx="48"
          cy="48"
          r={radius}
          className="stroke-primary"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent)}
        />
      </svg>
      <div className="grid h-[4.5rem] w-[4.5rem] place-items-center rounded-full bg-background text-3xl font-semibold">{display}</div>
    </div>
  );
}

type Suggestion = {
  index: number;
  title: string;
  text: string;
  action: string;
  impact: "Alto impacto" | "Médio impacto" | "Baixo impacto";
  annotation?: InlineAnnotation;
};

function SuggestionCard({ suggestion, active, onClick }: { suggestion: Suggestion; active: boolean; onClick: () => void }) {
  const impactDot =
    suggestion.impact === "Alto impacto"
      ? "bg-red-600"
      : suggestion.impact === "Médio impacto"
        ? "bg-amber-600"
        : "bg-slate-400";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-card border border-border bg-card p-4 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[var(--shadow-control)]",
        active && "border-primary bg-primary/10",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-semibold",
              annotationTone(suggestion.annotation).number,
            )}
          >
            {suggestion.index}
          </span>
          <div>
            <p className="font-semibold">{suggestion.title}</p>
            {suggestion.annotation ? (
              <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold", annotationTone(suggestion.annotation).badge)}>
                {competencyLabel(suggestion.annotation.competency)}
              </span>
            ) : null}
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-foreground">
          <span className={cn("h-2 w-2 rounded-full", impactDot)} aria-hidden="true" />
          {suggestion.impact}
        </span>
      </div>
      <p className="text-sm leading-6 text-foreground/85">{suggestion.text}</p>
      <div className="mt-4 flex items-center justify-between gap-3 text-sm font-semibold text-primary">
        <span className="inline-flex items-center gap-2">
          {suggestion.action.includes("citação") ? (
            <Link2 className="h-4 w-4" aria-hidden="true" />
          ) : (
            <WandSparkles className="h-4 w-4" aria-hidden="true" />
          )}
          {suggestion.action}
        </span>
        <MoreHorizontal className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>
    </button>
  );
}

function buildSuggestionCards(correction: Essay["correction"], annotations: InlineAnnotation[]): Suggestion[] {
  const base = annotations.map((annotation, index) => ({
    index: index + 1,
    title: suggestionTitle(annotation, index),
    text: annotation.comment,
    action: annotation.competency === "c2" || annotation.competency === "c3" ? "Adicionar citação" : "Reforçar com IA",
    impact: index === 0 ? "Alto impacto" : index === 1 ? "Médio impacto" : "Baixo impacto",
    annotation,
  })) satisfies Suggestion[];

  if (base.length) return base;
  return (correction?.suggestions ?? []).slice(0, 4).map((text, index) => ({
    index: index + 1,
    title: ["Força da tese", "Evidência", "Transições", "Conclusão"][index] ?? "Ajuste fino",
    text,
    action: index === 1 ? "Adicionar citação" : "Reforçar com IA",
    impact: index === 0 ? "Alto impacto" : index === 1 ? "Médio impacto" : "Baixo impacto",
  }));
}

// Cor fixa por competência ENEM — não depende de tema/dark mode, pra manter a mesma
// identidade visual (C1 azul, C2 violeta, C3 âmbar, C4 verde-azulado, C5 rosa) em qualquer contexto.
// Classes escritas por extenso (sem interpolação) porque o Tailwind precisa achá-las como literais no scan.
type Tone = { mark: string; marker: string; panel: string; number: string; badge: string; bar: string };

const DEFAULT_TONE: Tone = {
  mark: "bg-slate-200 decoration-slate-600 dark:bg-slate-800/60 dark:decoration-slate-300",
  marker: "border-slate-700 bg-slate-600 text-white",
  panel: "border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40",
  number: "bg-slate-600 text-white",
  badge: "bg-slate-600 text-white",
  bar: "bg-slate-600",
};

const COMPETENCY_TONES: Record<string, Tone> = {
  c1: {
    mark: "bg-blue-200 decoration-blue-600 dark:bg-blue-900/60 dark:decoration-blue-300",
    marker: "border-blue-700 bg-blue-600 text-white",
    panel: "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40",
    number: "bg-blue-600 text-white",
    badge: "bg-blue-600 text-white",
    bar: "bg-blue-600",
  },
  c2: {
    mark: "bg-violet-200 decoration-violet-600 dark:bg-violet-900/60 dark:decoration-violet-300",
    marker: "border-violet-700 bg-violet-600 text-white",
    panel: "border-violet-300 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/40",
    number: "bg-violet-600 text-white",
    badge: "bg-violet-600 text-white",
    bar: "bg-violet-600",
  },
  c3: {
    mark: "bg-amber-200 decoration-amber-700 dark:bg-amber-900/60 dark:decoration-amber-300",
    marker: "border-amber-700 bg-amber-600 text-white",
    panel: "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40",
    number: "bg-amber-600 text-white",
    badge: "bg-amber-600 text-white",
    bar: "bg-amber-600",
  },
  c4: {
    mark: "bg-teal-200 decoration-teal-700 dark:bg-teal-900/60 dark:decoration-teal-300",
    marker: "border-teal-700 bg-teal-600 text-white",
    panel: "border-teal-300 bg-teal-50 dark:border-teal-800 dark:bg-teal-950/40",
    number: "bg-teal-600 text-white",
    badge: "bg-teal-600 text-white",
    bar: "bg-teal-600",
  },
  c5: {
    mark: "bg-rose-200 decoration-rose-600 dark:bg-rose-900/60 dark:decoration-rose-300",
    marker: "border-rose-700 bg-rose-600 text-white",
    panel: "border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40",
    number: "bg-rose-600 text-white",
    badge: "bg-rose-600 text-white",
    bar: "bg-rose-600",
  },
};

function annotationTone(annotation?: InlineAnnotation | null) {
  if (!annotation) return DEFAULT_TONE;
  return COMPETENCY_TONES[annotation.competency] ?? DEFAULT_TONE;
}

function competencyTone(code: string) {
  return COMPETENCY_TONES[code.toLowerCase()] ?? DEFAULT_TONE;
}

function suggestionTitle(annotation: InlineAnnotation, index: number) {
  const labels: Record<string, string> = {
    c1: "Norma e precisão",
    c2: "Força da tese",
    c3: "Evidência",
    c4: "Transições",
    c5: "Intervenção",
  };
  return labels[annotation.competency] ?? ["Comentário", "Ajuste", "Destaque"][index] ?? "Comentário";
}

function competencyLabel(value: string) {
  const labels: Record<string, string> = {
    c1: "Competência 1 · Norma-padrão",
    c2: "Competência 2 · Tema e gênero",
    c3: "Competência 3 · Argumentação",
    c4: "Competência 4 · Coesão",
    c5: "Competência 5 · Intervenção",
  };
  return labels[value] ?? value.toUpperCase();
}

const COMPETENCY_DESCRIPTIONS: Record<string, string> = {
  C1: "Domínio da norma-padrão da língua escrita.",
  C2: "Compreensão da proposta e desenvolvimento do tema dentro do gênero dissertativo-argumentativo.",
  C3: "Seleção e organização de argumentos, fatos e repertório para defender um ponto de vista.",
  C4: "Uso de mecanismos linguísticos que dão coesão ao texto (conectivos, retomadas).",
  C5: "Elaboração de uma proposta de intervenção que respeite os direitos humanos.",
};

export function CompetencyLabel({ code }: { code: string }) {
  return (
    <TooltipRoot>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="cursor-help font-semibold underline decoration-dotted underline-offset-4">
          {code}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 text-sm leading-5">{COMPETENCY_DESCRIPTIONS[code] ?? code}</TooltipContent>
    </TooltipRoot>
  );
}

function slugify(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 70) || "redacao"
  );
}
