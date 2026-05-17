"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { animated, useSpring } from "@react-spring/web";
import { useHover } from "@use-gesture/react";
import { animate as motionOneAnimate } from "motion";
import gsap from "gsap";
import Lottie from "lottie-react";
import type { LucideIcon } from "lucide-react";
import { CheckCircle2, Lightbulb, Sparkles, Star, Target, Trophy, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/utils";

const easeOut = [0.16, 1, 0.3, 1] as const;

const pulseLottie = {
  v: "5.8.1",
  fr: 30,
  ip: 0,
  op: 60,
  w: 120,
  h: 120,
  nm: "soft-reward",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "ring",
      sr: 1,
      ks: {
        o: { a: 1, k: [{ t: 0, s: [0] }, { t: 8, s: [80] }, { t: 60, s: [0] }] },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [60, 60, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [{ t: 0, s: [40, 40, 100] }, { t: 60, s: [120, 120, 100] }] },
      },
      shapes: [
        {
          ty: "el",
          p: { a: 0, k: [0, 0] },
          s: { a: 0, k: [52, 52] },
        },
        {
          ty: "st",
          c: { a: 0, k: [0.96, 0.78, 0.16, 1] },
          o: { a: 0, k: 100 },
          w: { a: 0, k: 6 },
        },
      ],
      ip: 0,
      op: 60,
      st: 0,
      bm: 0,
    },
  ],
};

export function useGsapReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!ref.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ref.current?.querySelectorAll("[data-gsap-card]") ?? [],
        { y: 18, opacity: 0, scale: 0.98 },
        { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.055, ease: "power3.out" },
      );
    }, ref);
    return () => ctx.revert();
  }, []);

  return ref;
}

export function AnimatedGameCard({
  children,
  className,
  active,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [spring, api] = useSpring(() => ({ y: 0, scale: 1, rotate: 0, config: { tension: 360, friction: 24 } }));

  const bind = useHover(({ hovering }) => {
    api.start({ y: hovering ? -6 : 0, scale: hovering ? 1.015 : 1, rotate: hovering ? -0.4 : 0 });
  });

  function tap() {
    if (ref.current) {
      motionOneAnimate(ref.current, { transform: ["translateY(0) scale(1)", "translateY(3px) scale(.985)", "translateY(0) scale(1)"] } as Record<string, string[]>, { duration: 0.22, ease: "easeOut" });
    }
    onClick?.();
  }

  return (
    <animated.div
      {...bind()}
      ref={ref}
      data-gsap-card
      onClick={tap}
      style={spring}
      className={cn(
        "game-tile relative overflow-hidden bg-card p-4 will-change-transform",
        active && "bg-primary text-primary-foreground",
        onClick && "cursor-pointer",
        className,
      )}
    >
      {children}
    </animated.div>
  );
}

export function XPBurst({ amount, show, className }: { amount: number; show: boolean; className?: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.7, y: 10 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0.7, 1.14, 1], y: -36 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.85, ease: easeOut }}
          className={cn("pointer-events-none absolute right-4 top-4 z-20 rounded-full border-2 border-foreground bg-primary px-3 py-1 text-sm font-black text-primary-foreground shadow-[0_4px_0_hsl(var(--foreground))]", className)}
        >
          +{amount} XP
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ComboAnimation({ combo }: { combo: number }) {
  return (
    <motion.div
      key={combo}
      initial={{ scale: 0.86, rotate: -2 }}
      animate={{ scale: [0.86, 1.08, 1], rotate: [-2, 1, 0] }}
      transition={{ duration: 0.38, ease: easeOut }}
      className="game-chip inline-flex items-center gap-2 bg-primary px-3 py-2 text-xs font-black text-primary-foreground"
    >
      <FlareIcon />
      Combo {combo}x
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-0 z-30 grid place-items-center">
          <motion.div
            initial={{ y: 18, scale: 0.88, rotate: -2 }}
            animate={{ y: 0, scale: 1, rotate: 0 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 18 }}
            className="relative rounded-3xl border-2 border-foreground bg-card px-5 py-4 text-center shadow-[0_7px_0_hsl(var(--foreground))]"
          >
            <Lottie animationData={pulseLottie} loop={false} className="absolute -top-12 left-1/2 h-24 w-24 -translate-x-1/2" />
            <Trophy className="relative mx-auto h-7 w-7 text-primary" aria-hidden="true" />
            <p className="relative mt-2 text-lg font-black">{title}</p>
            <p className="relative text-sm font-black text-secondary">+{xp} XP</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function InteractiveMascot({ mood = "ready", size = "md" }: { mood?: "ready" | "happy" | "thinking"; size?: "sm" | "md" }) {
  return (
    <motion.div
      animate={{ y: [0, -4, 0], rotate: mood === "thinking" ? [0, -3, 3, 0] : [0, 1, 0] }}
      transition={{ duration: mood === "thinking" ? 0.8 : 2.4, repeat: Infinity, ease: "easeInOut" }}
      className={cn("relative shrink-0 rounded-2xl border-2 border-foreground bg-primary shadow-[0_4px_0_hsl(var(--foreground))]", size === "sm" ? "h-10 w-10" : "h-16 w-16")}
      aria-label="Mascote Donk"
    >
      <div className="absolute inset-2 rounded-xl bg-background/42" />
      <div className="absolute left-3 top-4 h-2 w-2 rounded-full bg-foreground" />
      <div className="absolute right-3 top-4 h-2 w-2 rounded-full bg-foreground" />
      <div className={cn("absolute left-1/2 top-7 h-1.5 -translate-x-1/2 rounded-full bg-foreground", mood === "happy" ? "w-6" : mood === "thinking" ? "w-2" : "w-4")} />
      <Sparkles className="absolute -right-2 -top-2 h-4 w-4 text-accent" aria-hidden="true" />
    </motion.div>
  );
}

export function ResponsiveHUD({
  level,
  xp,
  streak,
  progress,
}: {
  level: number;
  xp: number;
  streak: number;
  progress: number;
}) {
  return (
    <div className="game-surface grid gap-3 bg-card p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
      <InteractiveMascot mood={progress > 70 ? "happy" : "ready"} />
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="game-chip bg-primary px-3 py-1 text-xs font-black text-primary-foreground">Nível {level}</span>
          <span className="game-chip bg-accent/12 px-3 py-1 text-xs font-black text-accent">{streak} dias</span>
        </div>
        <p className="truncate text-2xl font-black tracking-normal">{xp} XP acumulado</p>
        <Progress value={progress} className="mt-3" />
      </div>
      <ComboAnimation combo={Math.max(1, Math.round(streak / 2))} />
    </div>
  );
}

export function SmoothProgressPath({ progress }: { progress: number }) {
  const clamped = Math.max(0, Math.min(100, progress));
  return (
    <svg viewBox="0 0 520 160" className="h-36 w-full" role="img" aria-label={`Progresso ${clamped}%`}>
      <path d="M30 105 C110 20 165 150 245 80 S390 10 490 86" fill="none" stroke="hsl(var(--border))" strokeWidth="18" strokeLinecap="round" />
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

export function SmartSuggestions({ suggestions }: { suggestions: string[] }) {
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

export function WritingSidebar({
  words,
  lines,
  wordProgress,
  structureProgress,
}: {
  words: number;
  lines: number;
  wordProgress: number;
  structureProgress: number;
}) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.42, ease: easeOut }}
      className="space-y-3"
    >
      <div className="game-tile bg-background/82 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-black">Radar da folha</p>
          <Target className="h-4 w-4 text-secondary" aria-hidden="true" />
        </div>
        <WriterMetric label="Volume" value={`${words} palavras`} progress={wordProgress} />
        <WriterMetric label="Estrutura" value={`${lines} linhas`} progress={structureProgress} />
      </div>
      <div className="game-tile bg-primary/10 p-4">
        <p className="mb-3 text-sm font-black">Sugestões rápidas</p>
        <SmartSuggestions
          suggestions={[
            "Use um repertório conectado à tese, não solto.",
            "Feche o desenvolvimento com consequência clara.",
            "Na intervenção, garanta agente, ação, meio e finalidade.",
          ]}
        />
      </div>
    </motion.aside>
  );
}

export function ENEMWritingSheet({
  value,
  disabled,
  autoFocus,
  onChange,
  placeholder,
  focusMode,
}: {
  value: string;
  disabled?: boolean;
  autoFocus?: boolean;
  onChange: (value: string) => void;
  placeholder?: string;
  focusMode?: boolean;
}) {
  return (
    <EssayPaper focusMode={focusMode}>
      <textarea
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
        spellCheck
        className="relative z-10 h-full w-full resize-none bg-transparent px-[9%] py-[8%] text-[clamp(14px,1.45vw,17px)] leading-[32px] text-foreground caret-primary outline-none selection:bg-primary/28"
        placeholder={placeholder}
      />
    </EssayPaper>
  );
}

export function EssayPaper({ children, focusMode }: { children: React.ReactNode; focusMode?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.985, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.42, ease: easeOut }}
      className={cn(
        "relative mx-auto aspect-[210/297] w-full overflow-hidden border-2 border-primary bg-[#fffdf7] text-foreground shadow-[0_5px_0_hsl(var(--primary)),0_18px_40px_rgba(31,37,50,.14)]",
        focusMode ? "max-h-[calc(100dvh-2rem)]" : "max-w-[794px]",
      )}
      style={{ backgroundImage: "linear-gradient(to bottom, transparent 31px, rgba(31,37,50,.16) 32px), radial-gradient(circle at 30% 10%, rgba(244,197,66,.08), transparent 32%)", backgroundSize: "100% 32px, 100% 100%" }}
    >
      <div className="pointer-events-none absolute inset-y-[7%] left-[7%] w-px bg-primary/35" />
      <div className="pointer-events-none absolute left-[3%] top-[8%] grid gap-[13px] font-mono text-[10px] font-black text-muted-foreground/70">
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
        <span className="font-black text-muted-foreground">{label}</span>
        <span className="font-black">{value}</span>
      </div>
      <Progress value={progress} />
    </div>
  );
}

function FlareIcon() {
  return <Star className="h-3.5 w-3.5" aria-hidden="true" />;
}
