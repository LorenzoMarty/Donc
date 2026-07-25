"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Eraser, Send, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RewardAnimation, SupportingTextBody, SupportingTextIcon } from "@/components/shared/motion-system";
import { EssayTimer } from "@/components/writing/essay-timer";
import { FloatingPostIts } from "@/components/writing/floating-post-its";
import type { Essay, EssayTheme } from "@/services/api";
import { useFreePostItsStore } from "@/stores/free-post-its-store";
import { cn } from "@/utils";

type EssayMarkTool = "highlighter-yellow" | "highlighter-green" | "highlighter-blue" | "highlighter-pink";

type EssayMark = { id: string; tool: EssayMarkTool; quote: string };

const MARK_TOOL_LABEL: Record<EssayMarkTool, string> = {
  "highlighter-yellow": "Marca-texto amarelo",
  "highlighter-green": "Marca-texto verde",
  "highlighter-blue": "Marca-texto azul",
  "highlighter-pink": "Marca-texto rosa",
};

const MARK_TOOL_STYLE: Record<EssayMarkTool, string> = {
  "highlighter-yellow": "rounded-sm bg-[#fff3a0]/70",
  "highlighter-green": "rounded-sm bg-[#b9f6c8]/70",
  "highlighter-blue": "rounded-sm bg-[#bde0ff]/70",
  "highlighter-pink": "rounded-sm bg-[#ffc9de]/70",
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
  const [marks, setMarks] = useState<EssayMark[]>([]);
  const [activeTool, setActiveTool] = useState<EssayMarkTool | "erase" | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const wasSavingRef = useRef(false);
  const wasLockedRef = useRef(false);
  const lastErrorRef = useRef<string | undefined>(undefined);
  const lines = estimateEditorLines(content);
  const lineNumbers = Array.from({ length: Math.max(30, lines) }, (_, index) => index + 1);
  const locked = essay?.status === "corrected";
  const canSubmit = Boolean(essay) && !locked && !saving && !submitting && wordCount >= 80;
  const syncLabel = submitting ? "Corrigindo..." : saving ? "Salvando..." : essay ? "Salvo" : "Rascunho local";
  const activeTheme = theme ?? essay?.theme ?? null;
  const addFreePostIt = useFreePostItsStore((state) => state.addPostIt);

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

  useEffect(() => {
    if (locked && !wasLockedRef.current) toast.success("Versão corrigida e bloqueada.");
    wasLockedRef.current = locked;
  }, [locked]);

  useEffect(() => {
    if (error && error !== lastErrorRef.current) toast.error(error);
    lastErrorRef.current = error;
  }, [error]);

  function goToPage(next: "folha" | "motivadores") {
    setPageDirection(next === "motivadores" ? 1 : -1);
    setPage(next);
  }

  /**
   * Fluxo igual ao mock (WritingSheet): a caneta/borracha vira uma "ferramenta armada" ao
   * clicar — ela não age sobre uma seleção pré-existente. É a seleção seguinte no texto (ao
   * soltar o mouse) que dispara a marcação, permitindo marcar vários trechos em sequência sem
   * reclicar na ferramenta a cada vez.
   */
  function handleSelectionRelease() {
    const textarea = textareaRef.current;
    if (!textarea || !activeTool) return;
    const { selectionStart, selectionEnd } = textarea;
    if (selectionEnd <= selectionStart) return;
    const quote = content.slice(selectionStart, selectionEnd);
    if (!quote.trim()) return;

    if (activeTool === "erase") {
      setMarks((prev) => prev.filter((mark) => !mark.quote.includes(quote) && !quote.includes(mark.quote)));
      return;
    }
    setMarks((prev) => [...prev, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, tool: activeTool, quote }]);
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
      className="flex flex-col rounded-card bg-card shadow-soft md:h-dvh md:overflow-hidden md:rounded-none md:shadow-none"
    >
      <RewardAnimation show={showSaved} title="Rascunho salvo" xp={0} />

      <div className="flex min-h-0 flex-1 flex-col bg-background">
        <header className="flex items-start gap-4 bg-transparent px-4 pb-2 pt-4 md:px-8">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Voltar"
              className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-control border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
          <div className="min-w-0 flex-1">
            <input
              value={title}
              disabled={locked}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="Nomeie sua redação"
              aria-label="Título da redação"
              className="text-safe font-display min-w-0 w-full rounded-sm border-none bg-transparent text-[25px] font-medium leading-tight text-foreground outline-none placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-ring/30"
            />
            <div className="mt-1.5 flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <span className="h-[7px] w-[7px] rounded-full bg-primary" aria-hidden="true" />
              {syncLabel}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {!locked ? <EssayTimer className="rounded-[11px] px-[13px] py-2" /> : null}
            <Button onClick={onSubmit} disabled={!canSubmit} className="h-auto rounded-[11px] px-[18px] py-2.5 text-[14px] font-semibold">
              <Send className="h-4 w-4" aria-hidden="true" />
              {submitting ? "Corrigindo..." : "Corrigir"}
            </Button>
          </div>
        </header>

        <div className="relative min-h-0 flex-1 overflow-hidden" style={{ perspective: 1600 }}>
          {activeTheme ? (
            <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center">
              <div className="pointer-events-auto inline-flex gap-0.5 rounded-control bg-muted/70 p-[3px] backdrop-blur-sm">
                <PageTab active={page === "folha"} onClick={() => goToPage("folha")} label="Folha de redação" />
                <PageTab active={page === "motivadores"} onClick={() => goToPage("motivadores")} label="Textos motivadores" />
              </div>
            </div>
          ) : null}
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
                className="mobile-scroll absolute inset-0 overflow-y-auto bg-background px-5 pb-24 pt-14 md:px-9 md:pt-16"
              >
                <div
                  className="relative mx-auto grid max-w-[940px] grid-cols-[2rem_minmax(0,1fr)] gap-3 rounded-card bg-[#fffdf8] px-5 py-6 shadow-elevated md:grid-cols-[2.4rem_minmax(0,1fr)] md:px-6 lg:px-8"
                >
                  <div
                    aria-hidden="true"
                    className="select-none pt-1 text-right text-[0.82rem] leading-[var(--essay-line-height)] text-[#3c3c43]/32 [--essay-line-height:2.82rem] md:text-[0.88rem]"
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
                      className="font-display pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words pt-1 text-[1.48rem] leading-[var(--essay-line-height)] text-[#26241f] [--essay-line-height:2.82rem]"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(to bottom, transparent 0, transparent calc(var(--essay-line-height) - 1px), rgba(60,60,67,.10) calc(var(--essay-line-height) - 1px), rgba(60,60,67,.10) var(--essay-line-height))",
                      }}
                    >
                      {markSegments.map((segment, index) =>
                        segment.mark ? (
                          <mark key={index} className={cn("bg-transparent text-[#26241f]", MARK_TOOL_STYLE[segment.mark.tool])}>
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
                      onMouseUp={handleSelectionRelease}
                      spellCheck
                      placeholder="Comece sua redação aqui..."
                      className="font-display absolute inset-0 h-full w-full resize-none bg-transparent pt-1 text-[1.48rem] leading-[var(--essay-line-height)] text-transparent caret-primary outline-none placeholder:italic placeholder:text-[#3c3c43]/34 [--essay-line-height:2.82rem]"
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
                className="mobile-scroll absolute inset-0 overflow-y-auto bg-background px-5 pb-8 pt-14 md:px-9 md:pt-16"
              >
                <MotivatorsBooklet theme={activeTheme} />
              </motion.article>
            )}
          </AnimatePresence>

          {page === "folha" ? <FloatingPostIts themeId={activeTheme?.id} /> : null}

          {page === "folha" && !locked ? (
            <Dock
              activeTool={activeTool}
              onSelectTool={setActiveTool}
              onClear={() => setMarks([])}
              hasMarks={marks.length > 0}
              onAddPostIt={() => addFreePostIt(activeTheme?.id)}
            />
          ) : null}
        </div>
      </div>
    </motion.section>
  );
}

function PageTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "whitespace-nowrap rounded-md px-4 py-2 text-sm font-semibold transition-colors",
        active ? "bg-card text-foreground shadow-soft" : "text-[#8a8a8e] hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

const PEN_SWATCHES: { tool: EssayMarkTool; color: string }[] = [
  { tool: "highlighter-yellow", color: "#fff3a0" },
  { tool: "highlighter-green", color: "#b9f6c8" },
  { tool: "highlighter-blue", color: "#bde0ff" },
  { tool: "highlighter-pink", color: "#ffc9de" },
];

/**
 * Dock fixo estilo macOS — canetas/marca-texto sublinham o trecho selecionado na folha (não
 * desenho livre), borracha/limpar removem marcações, e "+" cria um post-it livre arrastável por
 * toda a tela (`useFreePostItsStore`), reunindo no mesmo lugar as ferramentas que antes viviam no
 * `PenBar`.
 */
function Dock({
  activeTool,
  onSelectTool,
  onClear,
  hasMarks,
  onAddPostIt,
}: {
  activeTool: EssayMarkTool | "erase" | null;
  onSelectTool: (tool: EssayMarkTool | "erase" | null) => void;
  onClear: () => void;
  hasMarks: boolean;
  onAddPostIt: () => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
      <div className="pointer-events-auto flex items-end gap-1.5 rounded-card border border-white/60 bg-card/80 px-2.5 py-2 shadow-elevated backdrop-blur-xl">
        {PEN_SWATCHES.map((pen) => {
          const armed = activeTool === pen.tool;
          return (
            <button
              key={pen.tool}
              type="button"
              onClick={() => onSelectTool(armed ? null : pen.tool)}
              aria-label={MARK_TOOL_LABEL[pen.tool]}
              aria-pressed={armed}
              title={`Marca-texto: ${MARK_TOOL_LABEL[pen.tool]}`}
              className={cn(
                "flex w-[34px] flex-col items-center justify-end rounded-t-md rounded-b-[3px] bg-transparent p-0 transition-all",
                armed ? "h-[52px] -translate-y-1.5" : "h-[46px]",
              )}
            >
              <span
                className="w-[22px] flex-1 rounded-t-md rounded-b-[2px] border border-black/[0.06] shadow-[inset_0_2px_0_rgba(255,255,255,.5),0_4px_10px_-4px_rgba(0,0,0,.3)]"
                style={{ backgroundColor: pen.color }}
                aria-hidden="true"
              />
              <span className="h-[7px] w-4 rounded-b-[3px] brightness-[.82]" style={{ backgroundColor: pen.color }} aria-hidden="true" />
            </button>
          );
        })}

        <div className="mx-1 mb-1.5 h-7 w-px bg-border" aria-hidden="true" />

        <button
          type="button"
          onClick={() => onSelectTool(activeTool === "erase" ? null : "erase")}
          aria-label="Remover marca-texto"
          aria-pressed={activeTool === "erase"}
          title="Remover marca-texto"
          className={cn(
            "mb-1.5 grid h-9 w-9 place-items-center rounded-control text-muted-foreground transition-transform",
            activeTool === "erase" ? "-translate-y-1 bg-muted/60" : "hover:scale-110 hover:bg-muted/60",
          )}
        >
          <Eraser className="h-4 w-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onAddPostIt}
          aria-label="Adicionar post-it"
          title="Adicionar post-it"
          className="mb-1.5 grid h-[46px] w-[46px] place-items-center rounded-control bg-transparent transition-transform hover:-translate-y-1"
        >
          <svg width="23" height="23" viewBox="0 0 24 24" fill="#ffe27a" stroke="#c99a00" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
            <path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9l7-7V5a2 2 0 0 0-2-2z" />
            <path d="M14 21v-5a1 1 0 0 1 1-1h5" fill="#ffd23f" />
          </svg>
        </button>

        <button
          type="button"
          onClick={onClear}
          disabled={!hasMarks}
          aria-label="Limpar folha"
          title="Limpar folha"
          className="mb-1.5 grid h-9 w-9 place-items-center rounded-control text-muted-foreground transition-transform hover:scale-110 hover:bg-destructive/10 hover:text-destructive active:scale-95 disabled:opacity-40 disabled:hover:scale-100 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/** Caderno de textos motivadores em página cheia — simula folhear o caderno físico da prova. */
function MotivatorsBooklet({ theme }: { theme: EssayTheme | null }) {
  if (!theme) return null;

  if (!theme.supporting_texts?.length) {
    return (
      <div className="mx-auto max-w-[720px]">
        <div className="rounded-card bg-card px-5 py-6 shadow-elevated md:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Textos motivadores</p>
          <h2 className="font-display mt-1 text-xl font-medium leading-snug tracking-normal md:text-2xl">{theme.title}</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{theme.context}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[720px] space-y-4">
      <div className="rounded-card bg-card px-5 py-6 shadow-elevated md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Textos motivadores</p>
        <h2 className="font-display mt-1 text-xl font-medium leading-snug tracking-normal md:text-2xl">{theme.title}</h2>
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

