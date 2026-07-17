"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  ImageIcon,
  Lightbulb,
  Megaphone,
  MessageCircle,
  Newspaper,
  Target,
  Trophy,
  X,
} from "lucide-react";

import { Progress } from "@/components/ui/progress";
import type { EssayTheme, SupportingText } from "@/types/api";
import { useHighlightsStore, type MotivadorHighlight } from "@/stores/highlights-store";
import { cn } from "@/utils";

const easeOut = [0.16, 1, 0.3, 1] as const;

// Referencia estavel: um novo `[]` a cada render faz o seletor do zustand achar que o
// estado mudou (comparacao por referencia) e re-renderizar em loop infinito.
const EMPTY_HIGHLIGHTS: MotivadorHighlight[] = [];

export function AnimatedGameCard({
  children,
  className,
  active,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.div
      initial={false}
      whileHover={{ y: -6, scale: 1.015, rotate: -0.4 }}
      whileTap={{ y: 3, scale: 0.985 }}
      transition={{ type: "spring", stiffness: 360, damping: 24 }}
      onClick={onClick}
      className={cn(
        "game-tile relative overflow-hidden bg-card p-4 will-change-transform",
        active && "bg-primary text-primary-foreground",
        onClick && "cursor-pointer",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

export function FriendlyErrorFeedback({ message, show }: { message: string; show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0, x: [-3, 3, -2, 2, 0] }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.38, ease: easeOut }}
          className="game-tile bg-primary/12 p-3 text-sm font-bold text-foreground"
        >
          <div className="flex gap-3">
            <InteractiveMascot mood="thinking" size="sm" />
            <p className="leading-6">{message}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function RewardAnimation({ show, title = "Boa!", xp = 30 }: { show: boolean; title?: string; xp?: number }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none absolute inset-0 z-30 grid place-items-center"
        >
          <motion.div
            initial={{ y: 18, scale: 0.88, rotate: -2 }}
            animate={{ y: 0, scale: 1, rotate: 0 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 18 }}
            className="game-surface relative bg-card px-5 py-4 text-center"
          >
            <motion.span
              aria-hidden="true"
              className="absolute -top-8 left-1/2 h-16 w-16 -translate-x-1/2 rounded-full border-4 border-primary/70"
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: [0, 0.85, 0], scale: [0.4, 1.25, 1.55] }}
              transition={{ duration: 0.75, ease: easeOut }}
            />
            <Trophy className="relative mx-auto h-7 w-7 text-primary" aria-hidden="true" />
            <p className="relative mt-2 text-lg font-semibold">{title}</p>
            <p className="relative text-sm font-semibold text-primary">progresso +{xp}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function NumberTicker({
  value,
  duration = 0.9,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    function tick(now: number) {
      const progress = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span className={className}>{display}</span>;
}

export function InteractiveMascot({ mood = "ready", size = "md" }: { mood?: "ready" | "happy" | "thinking"; size?: "sm" | "md" }) {
  const Icon = mood === "thinking" ? Lightbulb : mood === "happy" ? CheckCircle2 : Target;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.22, ease: easeOut }}
      className={cn(
        "grid shrink-0 place-items-center rounded-control bg-primary/12 text-primary",
        size === "sm" ? "h-10 w-10" : "h-16 w-16",
      )}
      aria-label="Indicador de progresso"
    >
      <Icon className={cn(size === "sm" ? "h-5 w-5" : "h-7 w-7")} aria-hidden="true" />
    </motion.div>
  );
}

export function SmoothProgressPath({ progress }: { progress: number }) {
  const clamped = Math.max(0, Math.min(100, progress));
  return (
    <svg viewBox="0 0 520 160" className="h-36 w-full" role="img" aria-label={`Progresso ${clamped}%`}>
      <path
        d="M30 105 C110 20 165 150 245 80 S390 10 490 86"
        fill="none"
        stroke="hsl(var(--border))"
        strokeWidth="18"
        strokeLinecap="round"
      />
      <motion.path
        d="M30 105 C110 20 165 150 245 80 S390 10 490 86"
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="18"
        strokeLinecap="round"
        pathLength={100}
        initial={{ strokeDasharray: "0 100" }}
        animate={{ strokeDasharray: `${clamped} 100` }}
        transition={{ duration: 1, ease: easeOut }}
      />
      {[30, 160, 290, 420, 490].map((x, index) => (
        <motion.circle
          key={x}
          cx={x}
          cy={index % 2 ? 62 : 105}
          r="18"
        fill={index * 25 <= clamped ? "hsl(var(--primary))" : "hsl(var(--card))"}
        stroke="hsl(var(--border))"
          strokeWidth="5"
          initial={{ scale: 0.8 }}
          animate={{ scale: index * 25 <= clamped ? [1, 1.08, 1] : 1 }}
          transition={{ duration: 0.4, delay: index * 0.08 }}
        />
      ))}
    </svg>
  );
}

export function WritingSidebar({
  lines,
  paragraphs,
  structureProgress,
  theme,
  personalizedTip,
}: {
  lines: number;
  paragraphs: number;
  structureProgress: number;
  theme?: EssayTheme | null;
  personalizedTip?: { title: string; text: string } | null;
}) {
  const [tab, setTab] = useState<"guia" | "motivadores">("guia");
  const hasMotivadores = Boolean(theme?.supporting_texts?.length);

  return (
    <motion.aside
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.42, ease: easeOut }}
      className="space-y-1.5"
    >
      <div className="flex gap-1 rounded-md bg-muted/45 p-1">
        <button
          type="button"
          onClick={() => setTab("guia")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-semibold transition-colors",
            tab === "guia" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Target className="h-3.5 w-3.5" aria-hidden="true" />
          Guia
        </button>
        <button
          type="button"
          onClick={() => setTab("motivadores")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-semibold transition-colors",
            tab === "motivadores" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
          Motivadores
        </button>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {tab === "guia" ? (
          <motion.div
            key="guia"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: easeOut }}
            className="space-y-1.5"
          >
            <div className="border-b border-border/55 pb-2.5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">Painel de escrita</p>
                <Target className="h-4 w-4 text-primary" aria-hidden="true" />
              </div>
              <WriterMetric label="Estrutura" value={`${lines} linhas`} progress={structureProgress} />
              <div className="mt-2">
                <WriterMetric label="Paragrafos" value={`${paragraphs}`} progress={Math.min(100, (paragraphs / 4) * 100)} />
              </div>
            </div>
            {personalizedTip ? (
              <div className="rounded-md bg-highlight-tint p-2.5">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-highlight">
                  Seu ponto de atenção
                </p>
                <p className="text-xs font-bold leading-5">{personalizedTip.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{personalizedTip.text}</p>
              </div>
            ) : null}
            <div className="pt-1">
              <p className="mb-2 text-sm font-semibold">Sugestoes rapidas</p>
              <SmartSuggestions
                suggestions={[
                  "Use um repertorio conectado a tese, nao solto.",
                  "Feche o desenvolvimento com consequencia clara.",
                  "Na intervencao, garanta agente, acao, meio e finalidade.",
                ]}
              />
            </div>
            <HighlightsSummary themeId={theme?.id} />
          </motion.div>
        ) : (
          <motion.div
            key="motivadores"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: easeOut }}
          >
            <MotivatingTextsPanel theme={theme} hasContent={hasMotivadores} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}

function MotivatingTextsPanel({ theme, hasContent }: { theme?: EssayTheme | null; hasContent: boolean }) {
  const [expanded, setExpanded] = useState<number | null>(0);

  if (!hasContent || !theme?.supporting_texts?.length) {
    return (
      <div className="border-b border-border/55 pb-4 text-center">
        <BookOpen className="mx-auto mb-2 h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-semibold">Sem textos motivadores</p>
        <p className="mt-1 text-xs text-muted-foreground">Este tema ainda nao possui textos de apoio cadastrados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {theme.supporting_texts.map((text, index) => (
        <div key={index} className="overflow-hidden border-b border-border/55">
          <button
            type="button"
            onClick={() => setExpanded(expanded === index ? null : index)}
            className="flex w-full items-center justify-between gap-2 p-3 text-left"
          >
            <div className="flex items-center gap-2 min-w-0">
              <SupportingTextIcon type={text.type} />
              <span className="text-xs font-semibold leading-snug">{text.title}</span>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{expanded === index ? "−" : "+"}</span>
          </button>
          <AnimatePresence initial={false}>
            {expanded === index && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: easeOut }}
                className="overflow-hidden"
              >
                <div className="px-3 pb-3">
                  <SupportingTextBody text={text} themeId={theme.id} textIndex={index} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

export function SupportingTextIcon({ type }: { type: SupportingText["type"] }) {
  const className = "h-3.5 w-3.5 shrink-0 text-primary";
  switch (type) {
    case "grafico":
    case "dados":
      return <BarChart3 className={className} aria-hidden="true" />;
    case "infografico":
      return <Megaphone className={className} aria-hidden="true" />;
    case "postagem":
      return <MessageCircle className={className} aria-hidden="true" />;
    case "manchete":
      return <Newspaper className={className} aria-hidden="true" />;
    case "charge":
    case "tirinha":
    case "imagem":
      return <ImageIcon className={className} aria-hidden="true" />;
    default:
      return <Lightbulb className={className} aria-hidden="true" />;
  }
}

function MiniBarChart({ points }: { points: { label: string; value: number }[] }) {
  const max = Math.max(1, ...points.map((point) => Math.abs(point.value)));
  return (
    <div className="space-y-1.5">
      {points.map((point, index) => (
        <div key={index} className="space-y-0.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{point.label}</span>
            <span className="font-semibold text-foreground">{point.value}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max(4, (Math.abs(point.value) / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SupportingTextBody({
  text,
  themeId,
  textIndex,
}: {
  text: SupportingText;
  themeId?: number;
  textIndex?: number;
}) {
  switch (text.type) {
    case "grafico":
      return text.chart_points?.length ? (
        <div className="space-y-2">
          <p className="text-xs leading-5 text-muted-foreground">{text.content}</p>
          <MiniBarChart points={text.chart_points} />
        </div>
      ) : (
        <p className="text-xs leading-5 text-muted-foreground">{text.content}</p>
      );

    case "infografico":
      return text.stat_items?.length ? (
        <div className="grid grid-cols-2 gap-2">
          {text.stat_items.map((stat, index) => (
            <div key={index} className="rounded-md border border-border/55 bg-muted/30 p-2 text-center">
              <p className="text-sm font-bold text-primary">{stat.value}</p>
              <p className="text-[11px] leading-tight text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs leading-5 text-muted-foreground">{text.content}</p>
      );

    case "postagem":
      return (
        <div className="rounded-md border border-border/55 bg-muted/30 p-2.5">
          <div className="mb-1 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
              {(text.post_author ?? "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">{text.post_author ?? "Perfil"}</p>
              {text.post_handle ? <p className="truncate text-[11px] text-muted-foreground">@{text.post_handle}</p> : null}
            </div>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">{text.content}</p>
        </div>
      );

    case "manchete":
      return (
        <div className="border-l-2 border-primary pl-2.5">
          {text.headline_subtitle ? (
            <p className="text-xs leading-5 text-muted-foreground">{text.headline_subtitle}</p>
          ) : null}
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{text.content}</p>
          {text.headline_source ? (
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-primary">{text.headline_source}</p>
          ) : null}
        </div>
      );

    case "charge":
    case "tirinha":
      return (
        <div className="space-y-2">
          {text.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={text.image_url} alt={text.title} className="w-full rounded-md border border-border/55" />
          ) : (
            <div className="rounded-md border border-dashed border-border/60 bg-muted/30 p-2.5 text-[11px] text-muted-foreground">
              Ilustração indisponível — descrição: {text.image_prompt ?? text.content}
            </div>
          )}
          {text.type === "tirinha" && text.comic_panels?.length ? (
            <ol className="list-decimal space-y-0.5 pl-4 text-[11px] text-muted-foreground">
              {text.comic_panels.map((panel, index) => (
                <li key={index}>{panel}</li>
              ))}
            </ol>
          ) : null}
        </div>
      );

    default:
      if (text.type === "motivador" && themeId != null && textIndex != null) {
        return (
          <HighlightableText
            themeId={themeId}
            textIndex={textIndex}
            textTitle={text.title}
            content={text.content}
          />
        );
      }
      return <p className="text-xs leading-5 text-muted-foreground">{text.content}</p>;
  }
}

function buildHighlightedSegments(content: string, highlights: MotivadorHighlight[]) {
  type Segment = { text: string; highlightId: string | null };
  const segments: Segment[] = [{ text: content, highlightId: null }];
  for (const highlight of highlights) {
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (segment.highlightId || !highlight.quote) continue;
      const idx = segment.text.indexOf(highlight.quote);
      if (idx === -1) continue;
      const before = segment.text.slice(0, idx);
      const match = segment.text.slice(idx, idx + highlight.quote.length);
      const after = segment.text.slice(idx + highlight.quote.length);
      const replacement: Segment[] = [];
      if (before) replacement.push({ text: before, highlightId: null });
      replacement.push({ text: match, highlightId: highlight.id });
      if (after) replacement.push({ text: after, highlightId: null });
      segments.splice(i, 1, ...replacement);
      break;
    }
  }
  return segments;
}

function HighlightableText({
  themeId,
  textIndex,
  textTitle,
  content,
}: {
  themeId: number;
  textIndex: number;
  textTitle: string;
  content: string;
}) {
  const containerRef = useRef<HTMLParagraphElement>(null);
  const highlights = useHighlightsStore((state) => state.highlightsByTheme[themeId] ?? EMPTY_HIGHLIGHTS);
  const addHighlight = useHighlightsStore((state) => state.addHighlight);
  const removeHighlight = useHighlightsStore((state) => state.removeHighlight);
  const textHighlights = highlights.filter((h) => h.textIndex === textIndex);

  function handleMouseUp() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !containerRef.current) return;
    if (!containerRef.current.contains(selection.anchorNode)) return;
    const quote = selection.toString().trim();
    if (quote.length < 3 || !content.includes(quote)) return;
    addHighlight(themeId, textIndex, textTitle, quote);
    selection.removeAllRanges();
  }

  const segments = buildHighlightedSegments(content, textHighlights);

  return (
    <p ref={containerRef} onMouseUp={handleMouseUp} className="text-xs leading-5 text-muted-foreground">
      {segments.map((segment, index) =>
        segment.highlightId ? (
          <mark
            key={index}
            role="button"
            tabIndex={0}
            title="Clique para remover o grifo"
            onClick={() => removeHighlight(themeId, segment.highlightId as string)}
            className="cursor-pointer rounded bg-amber-300/60 px-0.5 text-foreground"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </p>
  );
}

function HighlightsSummary({ themeId }: { themeId?: number }) {
  const highlights = useHighlightsStore((state) =>
    themeId != null ? state.highlightsByTheme[themeId] ?? EMPTY_HIGHLIGHTS : EMPTY_HIGHLIGHTS,
  );
  const removeHighlight = useHighlightsStore((state) => state.removeHighlight);

  if (themeId == null || !highlights.length) return null;

  return (
    <div className="mt-2.5 border-t border-border/55 pt-2.5">
      <p className="mb-2 text-sm font-semibold">Meus grifos</p>
      <div className="space-y-1.5">
        {highlights.map((highlight) => (
          <div
            key={highlight.id}
            className="flex items-start gap-1.5 rounded-md border border-border/55 bg-amber-300/10 p-2 text-[11px]"
          >
            <span className="flex-1 leading-4 text-muted-foreground">&ldquo;{highlight.quote}&rdquo;</span>
            <button
              type="button"
              onClick={() => removeHighlight(themeId, highlight.id)}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Remover grifo"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SmartSuggestions({ suggestions }: { suggestions: string[] }) {
  return (
    <div className="space-y-2">
      {suggestions.map((suggestion, index) => (
        <motion.button
          key={suggestion}
          type="button"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.04, ease: easeOut }}
          whileTap={{ scale: 0.97 }}
          className="w-full rounded-md bg-background/70 p-2.5 text-left text-xs font-bold leading-5 transition-colors hover:bg-primary/12"
        >
          <Lightbulb className="mb-2 h-4 w-4 text-primary" aria-hidden="true" />
          {suggestion}
        </motion.button>
      ))}
    </div>
  );
}

function WriterMetric({ label, value, progress }: { label: string; value: string; progress: number }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-muted-foreground">{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <Progress value={progress} />
    </div>
  );
}
