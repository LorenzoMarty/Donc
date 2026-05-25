"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Maximize2, PanelRightClose, PanelRightOpen, Save, Send, SpellCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSaved, setShowSaved] = useState(false);
  const wasSavingRef = useRef(false);
  const lines = Math.max(1, content.split("\n").length, Math.ceil(content.length / 92));
  const locked = essay?.status === "corrected";
  const canSubmit = Boolean(essay) && !locked && !saving && !submitting && wordCount >= 80;
  const syncLabel = submitting ? "Corrigindo..." : saving ? "Salvando..." : essay ? "Sincronizado" : "Rascunho local";
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
        className="fixed inset-0 z-[70] grid place-items-center overflow-auto bg-background px-2 py-4 sm:px-4 sm:py-6"
      >
        <button type="button" className="sr-only" onClick={() => onFocusModeChange(false)}>
          Sair do modo foco
        </button>
        <div className="w-full max-w-5xl space-y-3">
          {activeTheme ? <ThemeReference theme={activeTheme} compact /> : null}
          <div style={{ width: "min(94vw, calc((100dvh - 2rem) * 210 / 297), 794px)", marginInline: "auto" }}>
            <ENEMWritingSheet
              value={content}
              disabled={locked}
              autoFocus
              focusMode
              onChange={onContentChange}
              placeholder="Comece sua redação ENEM aqui..."
            />
          </div>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="game-surface relative overflow-visible bg-card"
    >
      <RewardAnimation show={showSaved} title="Rascunho salvo" xp={0} />
      <div className="sticky top-[calc(4.25rem+env(safe-area-inset-top))] z-20 flex flex-col gap-3 border-b border-border bg-card/95 p-3 shadow-sm backdrop-blur xs:p-4 md:top-0">
        <div className="min-w-0 flex-1">
          <Input
            value={title}
            disabled={locked}
            onChange={(event) => onTitleChange(event.target.value)}
            className="h-auto border-0 bg-transparent px-0 py-0 text-xl font-semibold shadow-none focus-visible:ring-0 md:text-2xl"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="outline">{lines} linhas</Badge>
            <Badge variant={paragraphCount >= 4 ? "success" : "outline"}>{paragraphCount} paragrafos</Badge>
            <Badge variant={wordCount >= 80 ? "success" : "outline"}>{wordCount} palavras</Badge>
            <Badge variant="success">{syncLabel}</Badge>
          </div>
          {activeTheme ? <ThemeReference theme={activeTheme} /> : null}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:flex xl:flex-wrap xl:items-center">
          <div className="game-tile col-span-2 flex min-h-11 items-center gap-2 bg-background/72 px-3 py-2 text-sm xs:col-span-1">
            <SpellCheck className="h-4 w-4 text-secondary" aria-hidden="true" />
            <span className="font-bold">Ortografia</span>
            <Switch checked aria-label="Corretor ortográfico" />
          </div>
          <Button variant="outline" onClick={() => setSidebarOpen((value) => !value)}>
            {sidebarOpen ? (
              <PanelRightClose className="h-4 w-4" aria-hidden="true" />
            ) : (
              <PanelRightOpen className="h-4 w-4" aria-hidden="true" />
            )}
            Guia
          </Button>
          <Button variant="outline" onClick={() => onFocusModeChange(true)}>
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
            Foco
          </Button>
          <Button variant="outline" disabled>
            <Save className="h-4 w-4" aria-hidden="true" />
            Auto
          </Button>
          <Button onClick={onSubmit} disabled={!canSubmit}>
            <Send className="h-4 w-4" aria-hidden="true" />
            {submitting ? "Corrigindo..." : "Corrigir"}
          </Button>
        </div>
      </div>

      <div className={cn("grid gap-3 bg-background/72 p-2 xs:p-3 md:p-4", sidebarOpen ? "xl:grid-cols-[minmax(0,1fr)_minmax(16rem,18rem)]" : "xl:grid-cols-1")}>
        <div className="min-w-0">
          <ENEMWritingSheet value={content} disabled={locked} onChange={onContentChange} placeholder="Comece sua redação ENEM aqui..." />
        </div>

        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0, x: 28, width: 0 }}
              animate={{ opacity: 1, x: 0, width: "auto" }}
              exit={{ opacity: 0, x: 28, width: 0 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="min-w-0 overflow-hidden"
            >
              <WritingSidebar lines={lines} paragraphs={paragraphCount} structureProgress={structureProgress} />
              <div className="mt-3">
                <FriendlyErrorFeedback
                  show={wordCount > 0 && wordCount < 80}
                  message="Bom começo. Para enviar à correção, desenvolva a tese com pelo menos um bloco argumentativo completo."
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {locked && (
        <div className="border-t border-border bg-primary/10 p-3 text-sm font-semibold text-primary">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Versão corrigida e bloqueada.
          </div>
        </div>
      )}

      {error ? (
        <div className="border-t border-border bg-destructive/10 p-3 text-sm font-semibold text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </div>
        </div>
      ) : null}
    </motion.section>
  );
}

function ThemeReference({ theme, compact = false }: { theme: EssayTheme; compact?: boolean }) {
  return (
    <section className={cn("mt-3 rounded-md border border-primary/30 bg-primary/10 text-foreground", compact ? "p-3" : "p-4")}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Tema da redacao</p>
      <h2 className={cn("mt-1 font-semibold leading-snug tracking-normal", compact ? "text-base" : "text-lg md:text-xl")}>{theme.title}</h2>
      <p className={cn("mt-2 whitespace-pre-wrap leading-6 text-muted-foreground", compact ? "text-xs" : "text-sm")}>{theme.context}</p>
    </section>
  );
}
