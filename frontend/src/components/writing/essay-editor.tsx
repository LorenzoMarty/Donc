"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Eraser, Send, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RewardAnimation, SupportingTextBody, SupportingTextIcon } from "@/components/shared/motion-system";
import { EssayTimer } from "@/components/writing/essay-timer";
import { FloatingPostIts } from "@/components/writing/floating-post-its";
import { useMarkOnSelection } from "@/hooks/useMarkOnSelection";
import type { Essay, EssayTheme } from "@/services/api";
import { useFreePostItsStore } from "@/stores/free-post-its-store";
import { useHighlightsStore, type MotivadorHighlight } from "@/stores/highlights-store";
import { MARK_TOOL_LABEL, MARK_TOOL_STYLE, PEN_SWATCHES, type EssayMarkTool } from "@/lib/mark-tools";
import { cn } from "@/utils";

type EssayMark = { id: string; tool: EssayMarkTool; quote: string };

// Referencia estavel: um novo `[]` a cada render faz o seletor do zustand achar que o
// estado mudou (comparacao por referencia) e re-renderizar em loop infinito.
const EMPTY_HIGHLIGHTS: MotivadorHighlight[] = [];

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
  const motivadorHighlights = useHighlightsStore((state) =>
    activeTheme ? state.highlightsByTheme[activeTheme.id] ?? EMPTY_HIGHLIGHTS : EMPTY_HIGHLIGHTS,
  );
  const clearHighlights = useHighlightsStore((state) => state.clearHighlights);

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
   * soltar o ponteiro) que dispara a marcação, permitindo marcar vários trechos em sequência sem
   * reclicar na ferramenta a cada vez.
   */
  const getSelectedQuote = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return null;
    const { selectionStart, selectionEnd } = textarea;
    if (selectionEnd <= selectionStart) return null;
    const quote = content.slice(selectionStart, selectionEnd);
    return quote.trim() ? quote : null;
  }, [content]);

  const handleMark = useCallback((quote: string, tool: EssayMarkTool) => {
    setMarks((prev) => [...prev, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, tool, quote }]);
  }, []);

  const handleErase = useCallback((quote: string) => {
    setMarks((prev) => prev.filter((mark) => !mark.quote.includes(quote) && !quote.includes(mark.quote)));
  }, []);

  const handleMarkOnSelection = useMarkOnSelection({
    activeTool,
    getSelectedQuote,
    onMark: handleMark,
    onErase: handleErase,
  });

  /**
   * Com ferramenta armada, colapsa a seleção do textarea logo depois de marcar — sem isso, em
   * touch/stylus o menu nativo do SO (Copiar/Recortar/Colar) fica sobreposto exatamente onde o
   * grifo acabou de aparecer, competindo pela mesma seleção. `requestAnimationFrame` porque
   * `setSelectionRange` síncrono no mesmo `pointerup` pode ser sobrescrito pela finalização da
   * seleção nativa do navegador.
   */
  const applyMarkAndCollapse = useCallback(
    (textarea: HTMLTextAreaElement) => {
      const hadActiveTool = Boolean(activeTool);
      handleMarkOnSelection();
      if (!hadActiveTool) return;
      const collapseAt = textarea.selectionEnd;
      requestAnimationFrame(() => {
        textarea.setSelectionRange(collapseAt, collapseAt);
      });
    },
    [activeTool, handleMarkOnSelection],
  );

  const handleSelectionRelease = useCallback(
    (event: React.PointerEvent<HTMLTextAreaElement>) => applyMarkAndCollapse(event.currentTarget),
    [applyMarkAndCollapse],
  );

  /**
   * Alternativa por teclado ao arraste do mouse/toque (REQ-10/acessibilidade): seleção via
   * Shift+setas não dispara `pointerup`, então sem isso marca-texto/borracha ficavam inacessíveis
   * por teclado. Soltar Shift é o sinal natural de "seleção finalizada" numa seleção por teclado.
   */
  const handleSelectionKeyUp = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Shift") applyMarkAndCollapse(event.currentTarget);
    },
    [applyMarkAndCollapse],
  );

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
      <RewardAnimation show={showSaved} title="Rascunho salvo" />

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
            <p
              aria-label="Título da redação"
              className="text-safe font-display min-w-0 text-[25px] font-medium leading-tight text-foreground"
            >
              {title || "Nomeie um tema para começar"}
            </p>
            <div className="mt-1.5 flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <span className="h-[7px] w-[7px] rounded-full bg-primary" aria-hidden="true" />
              {syncLabel}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <span
              className="inline-flex items-center gap-1.5 rounded-[11px] border border-border bg-card px-[13px] py-2 text-xs font-semibold text-foreground [font-variant-numeric:tabular-nums]"
              title="Palavras nesta redação"
            >
              {wordCount} palavras
            </span>
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
                  className="relative mx-auto grid max-w-[940px] grid-cols-[2rem_minmax(0,1fr)] gap-3 rounded-card bg-paper px-5 py-6 shadow-elevated md:grid-cols-[2.4rem_minmax(0,1fr)] md:px-6 lg:px-8"
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
                      onPointerUp={handleSelectionRelease}
                      onKeyUp={handleSelectionKeyUp}
                      spellCheck
                      placeholder="Comece sua redação aqui..."
                      className={cn(
                        "font-display absolute inset-0 h-full w-full resize-none bg-transparent pt-1 text-[1.48rem] leading-[var(--essay-line-height)] text-transparent caret-primary outline-none placeholder:italic placeholder:text-[#3c3c43]/34 [--essay-line-height:2.82rem]",
                        activeTool && "[-webkit-touch-callout:none]",
                      )}
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
                <MotivatorsBooklet theme={activeTheme} activeTool={activeTool} />
              </motion.article>
            )}
          </AnimatePresence>

          <FloatingPostIts themeId={activeTheme?.id} />

          {!locked ? (
            <Dock
              activeTool={activeTool}
              onSelectTool={setActiveTool}
              onClear={() => (page === "motivadores" ? activeTheme && clearHighlights(activeTheme.id) : setMarks([]))}
              hasMarks={page === "motivadores" ? motivadorHighlights.length > 0 : marks.length > 0}
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

/** Posição arrastada do dock persiste entre sessões (fração 0..1 da área da folha). */
const DOCK_POSITION_STORAGE_KEY = "donk.dock-position.v1";

/**
 * Dock fixo estilo macOS — canetas/marca-texto sublinham o trecho selecionado na folha (não
 * desenho livre), borracha/limpar removem marcações, e "+" cria um post-it livre arrastável por
 * toda a tela (`useFreePostItsStore`), reunindo no mesmo lugar as ferramentas que antes viviam no
 * `PenBar`. O próprio dock é arrastável pelo grip à esquerda — em tablet a posição padrão pode
 * conflitar com controles do sistema (barra de gestos, opções da tela), então o usuário pode
 * reposicioná-lo; a posição escolhida fica salva em localStorage.
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
  const dockRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    parentWidth: number;
    parentHeight: number;
  } | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(DOCK_POSITION_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);

  function handleDragPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const dock = dockRef.current;
    const parent = dock?.offsetParent as HTMLElement | null;
    if (!dock || !parent) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const parentRect = parent.getBoundingClientRect();
    const dockRect = dock.getBoundingClientRect();
    draggingRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: (dockRect.left - parentRect.left) / parentRect.width,
      originY: (dockRect.top - parentRect.top) / parentRect.height,
      parentWidth: parentRect.width,
      parentHeight: parentRect.height,
    };
  }

  function handleDragPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const dragging = draggingRef.current;
    if (!dragging) return;
    const dx = (event.clientX - dragging.startX) / dragging.parentWidth;
    const dy = (event.clientY - dragging.startY) / dragging.parentHeight;
    const nextX = Math.min(0.92, Math.max(0, dragging.originX + dx));
    const nextY = Math.min(0.94, Math.max(0, dragging.originY + dy));
    setDragPosition({ x: nextX, y: nextY });
  }

  function handleDragPointerUp() {
    if (!draggingRef.current) return;
    draggingRef.current = null;
    setDragPosition((current) => {
      if (current) {
        setPosition(current);
        try {
          localStorage.setItem(DOCK_POSITION_STORAGE_KEY, JSON.stringify(current));
        } catch {
          // localStorage indisponível — posição fica só na sessão atual
        }
      }
      return null;
    });
  }

  const livePosition = dragPosition ?? position;

  return (
    <div
      ref={dockRef}
      className={cn(
        "pointer-events-auto absolute flex items-end gap-1 rounded-card border border-white/60 bg-card/[0.86] px-2.5 py-2 shadow-dock backdrop-blur-[var(--glass-floating-blur)] backdrop-saturate-[1.8]",
        !livePosition && "inset-x-0 bottom-6 mx-auto w-fit",
      )}
      style={livePosition ? { left: `${livePosition.x * 100}%`, top: `${livePosition.y * 100}%` } : undefined}
    >
      <div
        onPointerDown={handleDragPointerDown}
        onPointerMove={handleDragPointerMove}
        onPointerUp={handleDragPointerUp}
        onPointerCancel={handleDragPointerUp}
        role="button"
        tabIndex={0}
        aria-label="Mover dock"
        title="Arrastar dock"
        className="mb-1.5 grid h-9 w-6 shrink-0 cursor-grab touch-none place-items-center self-stretch rounded-control hover:bg-muted/60 active:cursor-grabbing"
      >
        <span aria-hidden="true" className="h-5 w-[3px] rounded-full bg-muted-foreground/35" />
      </div>

      <div className="mr-0.5 h-7 w-px self-center bg-border" aria-hidden="true" />

      <div className="flex items-end gap-1.5">
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
function MotivatorsBooklet({
  theme,
  activeTool,
}: {
  theme: EssayTheme | null;
  activeTool: EssayMarkTool | "erase" | null;
}) {
  if (!theme) return null;

  return (
    <div className="mx-auto max-w-[940px] rounded-card bg-paper px-5 py-6 shadow-elevated md:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Textos motivadores</p>
      <h2 className="font-display mt-1 text-xl font-medium leading-snug tracking-normal text-[#26241f] md:text-2xl">{theme.title}</h2>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#3c3c43]/72">{theme.context}</p>

      {theme.supporting_texts?.map((text, index) => (
        <div key={index} className="mt-6 border-t border-[#3c3c43]/12 pt-5">
          <div className="mb-3 flex items-center gap-2">
            <SupportingTextIcon type={text.type} />
            <h3 className="text-sm font-semibold leading-snug text-[#26241f]">{text.title}</h3>
          </div>
          <SupportingTextBody text={text} themeId={theme.id} textIndex={index} activeTool={activeTool} />
        </div>
      ))}
    </div>
  );
}

function estimateEditorLines(content: string) {
  const rows = content.split("\n").reduce((total, line) => total + Math.max(1, Math.ceil(line.length / 80)), 0);
  return Math.max(1, rows);
}

