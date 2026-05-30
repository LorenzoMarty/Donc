"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FriendlyErrorFeedback, RewardAnimation, WritingSidebar } from "@/components/shared/motion-system";
import type { Essay, EssayTheme } from "@/services/api";
import { cn } from "@/utils";

export function EssayEditor({
  essay,
  theme,
  title,
  content,
  wordCount,
  paragraphCount,
  saving,
  submitting,
  error,
  onBack,
  onTitleChange,
  onContentChange,
  onSubmit,
}: {
  essay: Essay | null;
  theme: EssayTheme | null;
  title: string;
  content: string;
  wordCount: number;
  paragraphCount: number;
  saving: boolean;
  submitting: boolean;
  error?: string;
  onBack?: () => void;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const [showSaved, setShowSaved] = useState(false);
  const wasSavingRef = useRef(false);
  const lines = estimateEditorLines(content);
  const lineNumbers = Array.from({ length: Math.max(30, lines) }, (_, index) => index + 1);
  const locked = essay?.status === "corrected";
  const canSubmit = Boolean(essay) && !locked && !saving && !submitting && wordCount >= 80;
  const syncLabel = submitting ? "Corrigindo..." : saving ? "Salvando..." : essay ? "Salvo" : "Rascunho local";
  const structureProgress = Math.min(100, (lines / 30) * 100);
  const activeTheme = theme ?? essay?.theme ?? null;
  const headerTitle = activeTheme?.title ?? title;

  useEffect(() => {
    const shouldShowSaved = wasSavingRef.current && !saving && Boolean(essay) && essay?.status !== "corrected";
    wasSavingRef.current = saving;
    if (!shouldShowSaved) return;

    const showId = window.setTimeout(() => setShowSaved(true), 0);
    const hideId = window.setTimeout(() => setShowSaved(false), 800);
    return () => {
      window.clearTimeout(showId);
      window.clearTimeout(hideId);
    };
  }, [essay, saving]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="grid h-[calc(100dvh-5.5rem)] min-h-[560px] overflow-hidden rounded-md border border-border/70 bg-white shadow-sm md:h-dvh md:grid-cols-[minmax(0,1fr)_minmax(17rem,20rem)] md:rounded-none md:border-0 md:shadow-none"
    >
      <RewardAnimation show={showSaved} title="Rascunho salvo" xp={0} />

      <div className="flex min-h-0 flex-col bg-white">
        <header className="flex min-h-14 flex-col gap-2 border-b border-border/70 bg-white px-5 py-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start gap-3">
            {onBack ? (
              <Button type="button" variant="ghost" size="icon" onClick={onBack} aria-label="Voltar" className="mt-0.5 h-9 w-9 shrink-0">
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </Button>
            ) : null}
            <h1 className="text-safe min-w-0 text-xl font-semibold leading-tight tracking-normal lg:text-2xl">{headerTitle}</h1>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 font-medium text-accent">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              {syncLabel}
            </span>
            <span>
              <strong className="text-foreground">{wordCount.toLocaleString("pt-BR")}</strong> palavras
            </span>
            <span>{paragraphCount} parágrafos</span>
            <span>{lines} linhas</span>
          </div>
          <Input value={title} disabled={locked} onChange={(event) => onTitleChange(event.target.value)} className="sr-only" aria-label="Titulo da redacao" tabIndex={-1} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={onSubmit} disabled={!canSubmit}>
            <Send className="h-4 w-4" aria-hidden="true" />
            {submitting ? "Corrigindo..." : "Corrigir"}
          </Button>
        </div>
        </header>

        <article className="mobile-scroll min-h-0 overflow-y-auto bg-slate-50/60 px-5 py-8 md:px-9 lg:py-10">
          <div className="mx-auto grid max-w-[940px] grid-cols-[2rem_minmax(0,1fr)] gap-3 rounded-2xl border border-border/80 bg-white px-5 py-6 shadow-sm md:grid-cols-[2.4rem_minmax(0,1fr)] md:px-6 lg:px-8">
            <div
              aria-hidden="true"
              className="select-none pt-1 text-right font-mono text-[0.82rem] leading-[var(--essay-line-height)] text-muted-foreground/40 [--essay-line-height:2.82rem] md:text-[0.88rem]"
            >
              {lineNumbers.map((lineNumber) => (
                <div key={lineNumber} className="h-[var(--essay-line-height)]">
                  {lineNumber}
                </div>
              ))}
            </div>
            <textarea
              value={content}
              disabled={locked}
              onChange={(event) => onContentChange(event.target.value)}
              spellCheck
              placeholder="Comece sua redação aqui..."
              className="min-h-[calc(100dvh-18rem)] w-full resize-none bg-transparent pt-1 text-[1.48rem] leading-[var(--essay-line-height)] text-foreground caret-primary outline-none placeholder:text-muted-foreground/55 [--essay-line-height:2.82rem] [font-family:var(--font-merriweather,Georgia,serif)]"
            />
          </div>
        </article>
      </div>

      <aside className="mobile-scroll min-h-0 overflow-y-auto border-t border-border/55 bg-white p-4 md:border-l md:border-t-0">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Apoio</p>
              <h2 className="mt-0.5 text-sm font-semibold">Guia e textos</h2>
            </div>
            <Badge variant={wordCount >= 80 ? "success" : "outline"}>{wordCount >= 80 ? "Pronta" : "Rascunho"}</Badge>
          </div>

          <div className="space-y-2.5">
            {activeTheme ? <ThemeReference theme={activeTheme} compact /> : null}
            <WritingSidebar lines={lines} paragraphs={paragraphCount} structureProgress={structureProgress} theme={activeTheme} />
            <FriendlyErrorFeedback
              show={wordCount > 0 && wordCount < 80}
              message="Bom começo. Para enviar à correção, desenvolva a tese com pelo menos um bloco argumentativo completo."
            />
            {locked ? (
              <div className="rounded-md border border-primary/20 bg-primary/10 p-3 text-sm font-semibold text-primary">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Versão corrigida e bloqueada.
                </div>
              </div>
            ) : null}
            {error ? (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {error}
                </div>
              </div>
            ) : null}
          </div>
      </aside>
    </motion.section>
  );
}

function estimateEditorLines(content: string) {
  const rows = content.split("\n").reduce((total, line) => total + Math.max(1, Math.ceil(line.length / 80)), 0);
  return Math.max(1, rows);
}

function ThemeReference({ theme, compact = false }: { theme: EssayTheme; compact?: boolean }) {
  return (
    <section className={cn("border-b border-border/55 text-foreground", compact ? "pb-2.5" : "p-4")}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Tema da redação</p>
      <h2 className={cn("mt-1 font-semibold leading-snug tracking-normal", compact ? "text-sm" : "text-lg md:text-xl")}>{theme.title}</h2>
      <p className={cn("mt-1.5 whitespace-pre-wrap text-muted-foreground", compact ? "text-xs leading-5" : "text-sm leading-6")}>{theme.context}</p>
    </section>
  );
}
