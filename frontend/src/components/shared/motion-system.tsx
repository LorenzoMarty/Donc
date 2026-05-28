"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, CheckCircle2, Eye, Lightbulb, Target, Trophy } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import type { EssayTheme } from "@/types/api";
import { cn } from "@/utils";

const easeOut = [0.16, 1, 0.3, 1] as const;

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
            <p className="relative text-sm font-semibold text-secondary">progresso +{xp}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function InteractiveMascot({ mood = "ready", size = "md" }: { mood?: "ready" | "happy" | "thinking"; size?: "sm" | "md" }) {
  const Icon = mood === "thinking" ? Lightbulb : mood === "happy" ? CheckCircle2 : Target;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.22, ease: easeOut }}
      className={cn(
        "grid shrink-0 place-items-center rounded-md border border-primary/25 bg-primary/12 text-primary",
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
          fill={index * 25 <= clamped ? "hsl(var(--accent))" : "hsl(var(--card))"}
          stroke="hsl(var(--foreground))"
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
}: {
  lines: number;
  paragraphs: number;
  structureProgress: number;
  theme?: EssayTheme | null;
}) {
  const [tab, setTab] = useState<"guia" | "motivadores">("guia");
  const hasMotivadores = Boolean(theme?.supporting_texts?.length);

  return (
    <motion.aside
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.42, ease: easeOut }}
      className="space-y-3"
    >
      <div className="game-tile flex gap-1 bg-background/82 p-1">
        <button
          type="button"
          onClick={() => setTab("guia")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-2 text-xs font-semibold transition-colors",
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
            "flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-2 text-xs font-semibold transition-colors",
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
            className="space-y-3"
          >
            <div className="game-tile bg-background/82 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold">Painel de escrita</p>
                <Target className="h-4 w-4 text-secondary" aria-hidden="true" />
              </div>
              <WriterMetric label="Estrutura" value={`${lines} linhas`} progress={structureProgress} />
              <div className="mt-3">
                <WriterMetric label="Paragrafos" value={`${paragraphs}`} progress={Math.min(100, (paragraphs / 4) * 100)} />
              </div>
            </div>
            <div className="game-tile bg-primary/10 p-4">
              <p className="mb-3 text-sm font-semibold">Sugestoes rapidas</p>
              <SmartSuggestions
                suggestions={[
                  "Use um repertorio conectado a tese, nao solto.",
                  "Feche o desenvolvimento com consequencia clara.",
                  "Na intervencao, garanta agente, acao, meio e finalidade.",
                ]}
              />
            </div>
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
      <div className="game-tile bg-background/82 p-4 text-center">
        <BookOpen className="mx-auto mb-2 h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-semibold">Sem textos motivadores</p>
        <p className="mt-1 text-xs text-muted-foreground">Este tema ainda nao possui textos de apoio cadastrados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {theme.supporting_texts.map((text, index) => (
        <div key={index} className={cn("game-tile overflow-hidden", text.type === "perspectiva" ? "bg-secondary/10" : "bg-background/82")}>
          <button
            type="button"
            onClick={() => setExpanded(expanded === index ? null : index)}
            className="flex w-full items-center justify-between gap-2 p-3 text-left"
          >
            <div className="flex items-center gap-2 min-w-0">
              {text.type === "perspectiva" ? (
                <Eye className="h-3.5 w-3.5 shrink-0 text-secondary" aria-hidden="true" />
              ) : (
                <Lightbulb className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
              )}
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
                <p className="px-3 pb-3 text-xs leading-5 text-muted-foreground">{text.content}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

export function ENEMWritingSheet({
  value,
  disabled,
  autoFocus,
  onChange,
  placeholder,
}: {
  value: string;
  disabled?: boolean;
  autoFocus?: boolean;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <EssayPaper>
      <textarea
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
        spellCheck
        className="relative z-10 h-full w-full resize-none bg-transparent px-[9%] py-[8%] text-base leading-8 text-[#1f1a12] caret-primary outline-none selection:bg-primary/28 placeholder:text-[#888]/60 [font-family:var(--font-merriweather,Georgia,serif)]"
        placeholder={placeholder}
      />
    </EssayPaper>
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
          className="game-tile w-full bg-background/72 p-3 text-left text-xs font-bold leading-5 hover:bg-primary/12"
        >
          <Lightbulb className="mb-2 h-4 w-4 text-primary" aria-hidden="true" />
          {suggestion}
        </motion.button>
      ))}
    </div>
  );
}

function EssayPaper({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.985, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.42, ease: easeOut }}
      className="relative mx-auto aspect-[210/297] w-full max-w-[794px] overflow-hidden border border-primary/35 bg-[#fffdf7] text-[#1f1a12] shadow-[0_18px_40px_rgba(0,0,0,.18)]"
      style={{
        backgroundImage:
          "linear-gradient(to bottom, transparent 31px, rgba(48,38,18,.14) 32px), radial-gradient(circle at 30% 10%, rgba(244,197,66,.08), transparent 32%)",
        backgroundSize: "100% 32px, 100% 100%",
      }}
    >
      <div className="pointer-events-none absolute inset-y-[7%] left-[7%] w-px bg-primary/35" />
      <div className="pointer-events-none absolute left-[3%] top-[8%] grid gap-[13px] font-mono text-[10px] font-semibold text-[#7c705e]/70">
        {Array.from({ length: 30 }, (_, index) => (
          <span key={index}>{String(index + 1).padStart(2, "0")}</span>
        ))}
      </div>
      {children}
    </motion.div>
  );
}

function WriterMetric({ label, value, progress }: { label: string; value: string; progress: number }) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-muted-foreground">{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <Progress value={progress} />
    </div>
  );
}
