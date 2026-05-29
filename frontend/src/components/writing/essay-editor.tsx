"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Maximize2, Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ENEMWritingSheet, FriendlyErrorFeedback, RewardAnimation, WritingSidebar } from "@/components/shared/motion-system";
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
  focusMode,
  onTitleChange,
  onContentChange,
  onFocusModeChange,
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
  focusMode: boolean;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onFocusModeChange: (value: boolean) => void;
  onSubmit: () => void;
}) {
  const [showSaved, setShowSaved] = useState(false);
  const wasSavingRef = useRef(false);
  const lines = Math.max(1, content.split("\n").length, Math.ceil(content.length / 92));
  const locked = essay?.status === "corrected";
  const canSubmit = Boolean(essay) && !locked && !saving && !submitting && wordCount >= 80;
  const syncLabel = submitting ? "Corrigindo..." : saving ? "Salvando..." : essay ? "Salvo" : "Rascunho local";
  const structureProgress = Math.min(100, (lines / 30) * 100);
  const activeTheme = theme ?? essay?.theme ?? null;

  useEffect(() => {
    if (!focusMode) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onFocusModeChange(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focusMode, onFocusModeChange]);

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

  if (focusMode) {
    return (
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-[70] overflow-auto bg-background py-6"
      >
        <button type="button" className="sr-only" onClick={() => onFocusModeChange(false)}>
          Sair do modo foco
        </button>
        <div className="mx-auto space-y-4 px-4" style={{ width: "794px" }}>
          {activeTheme ? <ThemeReference theme={activeTheme} compact /> : null}
          <ENEMWritingSheet
            value={content}
            disabled={locked}
            autoFocus
            onChange={onContentChange}
            placeholder="Comece sua redação ENEM aqui..."
          />
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex h-[calc(100dvh-8.5rem)] min-h-[620px] flex-col overflow-hidden rounded-md border border-border bg-card lg:h-[calc(100dvh-4rem)]"
    >
      <RewardAnimation show={showSaved} title="Rascunho salvo" xp={0} />

      <header className="flex flex-col gap-3 border-b border-border bg-card px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <Input
            value={title}
            disabled={locked}
            onChange={(event) => onTitleChange(event.target.value)}
            className="h-auto max-w-4xl border-0 bg-transparent px-0 py-0 text-lg font-semibold shadow-none focus-visible:ring-0 lg:text-xl"
          />
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 font-medium text-accent">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {syncLabel}
            </span>
            <span>
              <strong className="text-foreground">{wordCount.toLocaleString("pt-BR")}</strong> palavras
            </span>
            <span>{paragraphCount} parágrafos</span>
            <span>{lines} linhas</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => onFocusModeChange(true)}>
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
            Foco
          </Button>
          <Button onClick={onSubmit} disabled={!canSubmit}>
            <Send className="h-4 w-4" aria-hidden="true" />
            {submitting ? "Corrigindo..." : "Corrigir"}
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,30rem)]">
        <article className="mobile-scroll min-h-0 overflow-y-auto bg-card px-5 py-8 md:px-10 lg:px-12">
          <div className="mx-auto max-w-[860px]">
            <textarea
              value={content}
              disabled={locked}
              onChange={(event) => onContentChange(event.target.value)}
              spellCheck
              placeholder="Comece sua redação aqui..."
              className="min-h-[calc(100dvh-18rem)] w-full resize-none bg-transparent text-[1.28rem] leading-[2.05] text-[#1f2937] caret-primary outline-none placeholder:text-muted-foreground/60 [font-family:var(--font-merriweather,Georgia,serif)]"
            />
          </div>
        </article>

        <aside className="mobile-scroll min-h-0 overflow-y-auto border-t border-border bg-background lg:border-l lg:border-t-0">
          <div className="sticky top-0 z-10 border-b border-border bg-background px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Apoio de escrita</p>
                <h2 className="mt-1 text-xl font-semibold">Guia e textos motivadores</h2>
              </div>
              <Badge variant={wordCount >= 80 ? "success" : "outline"}>{wordCount >= 80 ? "Pronta" : "Rascunho"}</Badge>
            </div>
          </div>

          <div className="space-y-4 p-5">
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
      </div>
    </motion.section>
  );
}

function ThemeReference({ theme, compact = false }: { theme: EssayTheme; compact?: boolean }) {
  return (
    <section className={cn("rounded-md border border-primary/30 bg-primary/10 text-foreground", compact ? "p-3" : "p-4")}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Tema da redação</p>
      <h2 className={cn("mt-1 font-semibold leading-snug tracking-normal", compact ? "text-base" : "text-lg md:text-xl")}>{theme.title}</h2>
      <p className={cn("mt-2 whitespace-pre-wrap leading-6 text-muted-foreground", compact ? "text-xs" : "text-sm")}>{theme.context}</p>
    </section>
  );
}
