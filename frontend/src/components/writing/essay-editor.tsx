"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eraser,
  PenLine,
  Send,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FriendlyErrorFeedback,
  RewardAnimation,
  SupportingTextBody,
  SupportingTextIcon,
  WritingSidebar,
} from "@/components/shared/motion-system";
import { EssayTimer } from "@/components/writing/essay-timer";
import { FloatingPostIts } from "@/components/writing/floating-post-its";
import { HydraRail } from "@/components/writing/hydra-rail";
import { dominantWeakness } from "@/features/gamification/adaptive";
import { HUBS } from "@/features/gamification/symptoms";
import type { Essay, EssayTheme } from "@/services/api";
import { useGameStore } from "@/stores/game-store";
import { cn } from "@/utils";

type EssayMarkTool = "pen-black" | "pen-blue" | "pen-red" | "highlighter";

type EssayMark = { id: string; tool: EssayMarkTool; quote: string };

const MARK_TOOL_LABEL: Record<EssayMarkTool, string> = {
  "pen-black": "Caneta preta",
  "pen-blue": "Caneta azul",
  "pen-red": "Caneta vermelha",
  highlighter: "Marca-texto",
};

const MARK_TOOL_STYLE: Record<EssayMarkTool, string> = {
  "pen-black": "underline decoration-2 underline-offset-2 decoration-[#1f2a24]",
  "pen-blue": "underline decoration-2 underline-offset-2 decoration-[#1d4ed8]",
  "pen-red": "underline decoration-2 underline-offset-2 decoration-[#b3122a]",
  highlighter: "rounded-sm bg-[#fbbf24]/45",
};

function buildMarkSegments(content: string, marks: EssayMark[]) {
  type Segment = { text: string; mark: EssayMark | null };
  const segments: Segment[] = [{ text: content, mark: null }];
  for (const mark of marks) {
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (segment.mark || !mark.quote) continue;
      const idx = segment.text.indexOf(mark.quote);
      if (idx === -1) continue;
      const before = segment.text.slice(0, idx);
      const match = segment.text.slice(idx, idx + mark.quote.length);
      const after = segment.text.slice(idx + mark.quote.length);
      const replacement: Segment[] = [];
      if (before) replacement.push({ text: before, mark: null });
      replacement.push({ text: match, mark });
      if (after) replacement.push({ text: after, mark: null });
      segments.splice(i, 1, ...replacement);
      break;
    }
  }
  return segments;
}

const pageFlipVariants = {
  enter: (direction: number) => ({
    rotateY: direction > 0 ? 92 : -92,
    opacity: 0,
    transformOrigin: direction > 0 ? "left center" : "right center",
  }),
  center: { rotateY: 0, opacity: 1, transformOrigin: "center center" },
  exit: (direction: number) => ({
    rotateY: direction > 0 ? -92 : 92,
    opacity: 0,
    transformOrigin: direction > 0 ? "right center" : "left center",
  }),
};

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
  const [page, setPage] = useState<"folha" | "motivadores">("folha");
  const [pageDirection, setPageDirection] = useState(1);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [marks, setMarks] = useState<EssayMark[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const wasSavingRef = useRef(false);
  const lines = estimateEditorLines(content);
  const lineNumbers = Array.from({ length: Math.max(30, lines) }, (_, index) => index + 1);
  const locked = essay?.status === "corrected";
  const canSubmit = Boolean(essay) && !locked && !saving && !submitting && wordCount >= 80;
  const syncLabel = submitting ? "Corrigindo..." : saving ? "Salvando..." : essay ? "Salvo" : "Rascunho local";
  const structureProgress = Math.min(100, (lines / 30) * 100);
  const activeTheme = theme ?? essay?.theme ?? null;
  const hasMotivadores = Boolean(activeTheme?.supporting_texts?.length);
  const adaptive = useGameStore((state) => state.adaptive);
  const weakHubId = dominantWeakness(adaptive);
  const personalizedTip = weakHubId ? { title: HUBS[weakHubId].title, text: HUBS[weakHubId].weaknessNarrative } : null;

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

  function goToPage(next: "folha" | "motivadores") {
    setPageDirection(next === "motivadores" ? 1 : -1);
    setPage(next);
  }

  function applyMark(tool: EssayMarkTool) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart, selectionEnd } = textarea;
    if (selectionEnd <= selectionStart) return;
    const quote = content.slice(selectionStart, selectionEnd);
    if (!quote.trim()) return;
    setMarks((prev) => [...prev, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, tool, quote }]);
  }

  function eraseMark() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart, selectionEnd } = textarea;
    if (selectionEnd <= selectionStart) return;
    const quote = content.slice(selectionStart, selectionEnd);
    setMarks((prev) => prev.filter((mark) => !mark.quote.includes(quote) && !quote.includes(mark.quote)));
  }

  function syncOverlayScroll() {
    if (overlayRef.current && textareaRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
      overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }

  const markSegments = buildMarkSegments(content, marks);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "flex flex-col rounded-card bg-card shadow-soft md:grid md:h-dvh md:overflow-hidden md:rounded-none md:shadow-none",
        sidebarCollapsed ? "md:grid-cols-[minmax(0,1fr)_4.5rem]" : "md:grid-cols-[minmax(0,1fr)_minmax(17rem,20rem)]",
      )}
    >
      <RewardAnimation show={showSaved} title="Rascunho salvo" xp={0} />

      <div className="flex min-h-0 flex-col bg-card">
        <header className="grid min-h-[4.75rem] gap-3 bg-card px-4 py-3 md:px-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-4">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2.5">
            {onBack ? (
              <Button type="button" variant="ghost" size="icon" onClick={onBack} aria-label="Voltar" className="h-11 w-11 shrink-0">
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </Button>
            ) : null}
            <input
              value={title}
              disabled={locked}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="Nomeie sua redação"
              aria-label="Título da redação"
              className="text-safe min-w-0 flex-1 rounded-sm border-none bg-transparent text-xl font-semibold leading-tight tracking-normal text-foreground outline-none placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-ring/30 lg:text-2xl"
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-10 text-xs font-medium text-muted-foreground">
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
        </div>

        <div className="flex items-center justify-end gap-3 self-center">
          {!locked ? <EssayTimer /> : null}
          <Button size="sm" onClick={onSubmit} disabled={!canSubmit} className="h-9">
            <Send className="h-4 w-4" aria-hidden="true" />
            {submitting ? "Corrigindo..." : "Corrigir"}
          </Button>
        </div>
        </header>

        {hasMotivadores ? (
          <div className="flex gap-1 border-b border-border/55 bg-card px-4 py-2 md:px-5">
            <PageTab active={page === "folha"} onClick={() => goToPage("folha")} icon={PenLine} label="Folha de redação" />
            <PageTab
              active={page === "motivadores"}
              onClick={() => goToPage("motivadores")}
              icon={BookOpen}
              label="Textos motivadores"
            />
          </div>
        ) : null}

        <div className="relative min-h-0 flex-1 overflow-hidden" style={{ perspective: 1600 }}>
          <AnimatePresence mode="wait" initial={false} custom={pageDirection}>
            {page === "folha" ? (
              <motion.article
                key="folha"
                custom={pageDirection}
                variants={pageFlipVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
                className="mobile-scroll absolute inset-0 overflow-y-auto bg-background px-5 py-8 pb-24 md:px-9 lg:py-10"
              >
                <div className="relative mx-auto grid max-w-[940px] grid-cols-[2rem_minmax(0,1fr)] gap-3 rounded-card bg-card px-5 py-6 shadow-elevated md:grid-cols-[2.4rem_minmax(0,1fr)] md:px-6 lg:px-8">
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
                  <div className="relative min-h-[calc(100dvh-18rem)] w-full">
                    <div
                      ref={overlayRef}
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words pt-1 text-[1.48rem] leading-[var(--essay-line-height)] text-foreground [--essay-line-height:2.82rem] [font-family:var(--font-merriweather,Georgia,serif)]"
                    >
                      {markSegments.map((segment, index) =>
                        segment.mark ? (
                          <mark key={index} className={cn("bg-transparent text-foreground", MARK_TOOL_STYLE[segment.mark.tool])}>
                            {segment.text}
                          </mark>
                        ) : (
                          <span key={index}>{segment.text}</span>
                        ),
                      )}
                      {"​"}
                    </div>
                    <textarea
                      ref={textareaRef}
                      value={content}
                      disabled={locked}
                      onChange={(event) => onContentChange(event.target.value)}
                      onScroll={syncOverlayScroll}
                      spellCheck
                      placeholder="Comece sua redação aqui..."
                      className="absolute inset-0 h-full w-full resize-none bg-transparent pt-1 text-[1.48rem] leading-[var(--essay-line-height)] text-transparent caret-primary outline-none placeholder:text-muted-foreground/55 [--essay-line-height:2.82rem] [font-family:var(--font-merriweather,Georgia,serif)]"
                    />
                  </div>
                </div>
              </motion.article>
            ) : (
              <motion.article
                key="motivadores"
                custom={pageDirection}
                variants={pageFlipVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
                className="mobile-scroll absolute inset-0 overflow-y-auto bg-background px-5 py-8 md:px-9 lg:py-10"
              >
                <MotivatorsBooklet theme={activeTheme} />
              </motion.article>
            )}
          </AnimatePresence>

          {page === "folha" ? <FloatingPostIts themeId={activeTheme?.id} /> : null}

          {page === "folha" && !locked ? (
            <PenBar onApplyMark={applyMark} onEraseMark={eraseMark} onClear={() => setMarks([])} hasMarks={marks.length > 0} />
          ) : null}
        </div>
      </div>

      <aside className={cn("mobile-scroll min-h-0 overflow-y-auto bg-card shadow-soft", sidebarCollapsed ? "p-2" : "p-4")}>
          <div className={cn("mb-2 flex items-center gap-2", sidebarCollapsed ? "flex-col" : "justify-between")}>
            {!sidebarCollapsed ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Apoio</p>
                <h2 className="mt-0.5 text-sm font-semibold">Guia e textos</h2>
              </div>
            ) : null}
            <div className={cn("flex items-center gap-2", sidebarCollapsed && "flex-col")}>
              {!sidebarCollapsed ? (
                <Badge variant={wordCount >= 80 ? "success" : "outline"}>{wordCount >= 80 ? "Pronta" : "Rascunho"}</Badge>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSidebarCollapsed((value) => !value)}
                aria-label={sidebarCollapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
                className="h-8 w-8 shrink-0"
              >
                {sidebarCollapsed ? (
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                )}
              </Button>
            </div>
          </div>

          {sidebarCollapsed ? (
            <HydraRail />
          ) : (
            <div className="space-y-2.5">
              {activeTheme ? <ThemeReference theme={activeTheme} compact /> : null}
              <WritingSidebar
                lines={lines}
                paragraphs={paragraphCount}
                structureProgress={structureProgress}
                theme={activeTheme}
                personalizedTip={personalizedTip}
              />
              <FriendlyErrorFeedback
                show={wordCount > 0 && wordCount < 80}
                message="Bom começo. Para enviar à correção, desenvolva a tese com pelo menos um bloco argumentativo completo."
              />
              {locked ? (
                <div className="rounded-control bg-primary/10 p-3 text-sm font-semibold text-primary">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Versão corrigida e bloqueada.
                  </div>
                </div>
              ) : null}
              {error ? (
                <div className="rounded-control bg-destructive/10 p-3 text-sm font-semibold text-destructive">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {error}
                  </div>
                </div>
              ) : null}
            </div>
          )}
      </aside>
    </motion.section>
  );
}

function PageTab({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof PenLine;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-control px-3 py-1.5 text-xs font-semibold transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}

const PEN_SWATCHES: { tool: EssayMarkTool; color: string }[] = [
  { tool: "pen-black", color: "#1f2a24" },
  { tool: "pen-blue", color: "#1d4ed8" },
  { tool: "pen-red", color: "#b3122a" },
  { tool: "highlighter", color: "#fbbf24" },
];

/** Bottom bar de canetas — sublinha/marca o trecho selecionado na folha, não desenho livre. */
function PenBar({
  onApplyMark,
  onEraseMark,
  onClear,
  hasMarks,
}: {
  onApplyMark: (tool: EssayMarkTool) => void;
  onEraseMark: () => void;
  onClear: () => void;
  hasMarks: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-1.5 rounded-control border border-border bg-card px-2 py-1.5 shadow-elevated">
        {PEN_SWATCHES.map((pen) => (
          <button
            key={pen.tool}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onApplyMark(pen.tool)}
            aria-label={MARK_TOOL_LABEL[pen.tool]}
            title={`Sublinhar seleção: ${MARK_TOOL_LABEL[pen.tool]}`}
            className="grid h-8 w-8 place-items-center rounded-control transition-colors hover:bg-muted/60"
          >
            <span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: pen.color }} aria-hidden="true" />
          </button>
        ))}

        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onEraseMark}
          aria-label="Borracha"
          title="Remover marcação da seleção"
          className="grid h-8 w-8 place-items-center rounded-control text-muted-foreground transition-colors hover:bg-muted/60"
        >
          <Eraser className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="mx-1 h-6 w-px bg-border" aria-hidden="true" />

        <button
          type="button"
          onClick={onClear}
          disabled={!hasMarks}
          aria-label="Limpar marcações"
          className="grid h-8 w-8 place-items-center rounded-control text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/** Caderno de textos motivadores em página cheia — simula folhear o caderno físico da prova. */
function MotivatorsBooklet({ theme }: { theme: EssayTheme | null }) {
  if (!theme?.supporting_texts?.length) return null;

  return (
    <div className="mx-auto max-w-[720px] space-y-4">
      <div className="rounded-card bg-card px-5 py-6 shadow-elevated md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Textos motivadores</p>
        <h2 className="mt-1 text-xl font-semibold leading-snug tracking-normal md:text-2xl">{theme.title}</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{theme.context}</p>
      </div>
      {theme.supporting_texts.map((text, index) => (
        <div key={index} className="rounded-card bg-card px-5 py-5 shadow-elevated md:px-8">
          <div className="mb-3 flex items-center gap-2">
            <SupportingTextIcon type={text.type} />
            <h3 className="text-sm font-semibold leading-snug">{text.title}</h3>
          </div>
          <SupportingTextBody text={text} themeId={theme.id} textIndex={index} />
        </div>
      ))}
    </div>
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
