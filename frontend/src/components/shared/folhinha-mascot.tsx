"use client";

import { motion } from "framer-motion";

import { cn } from "@/utils";

const MOUTHS: Record<FolhinhaMood, string> = {
  happy: "M67 68 q10 7 20 0",
  cheer: "M65 66 q12 13 24 0",
  think: "M69 70 q9 -3 17 1",
  write: "M68 68 q9 6 18 0",
};

export type FolhinhaMood = "happy" | "cheer" | "think" | "write";

/** Mascote "Folhinha" — fiel ao Folhinha.dc.html do pacote de mockups (bloco de notas com rosto,
 * 4 humores, balão de fala opcional). Compartilhado entre Onboarding e Painel. */
export function FolhinhaMascot({
  mood = "happy",
  message,
  size = 120,
  side = "right",
  onDark = false,
  className,
}: {
  mood?: FolhinhaMood;
  message?: string;
  size?: number;
  side?: "left" | "right";
  onDark?: boolean;
  className?: string;
}) {
  const bubbleBg = onDark ? "#fffdf8" : "#fff";
  const bubbleColor = onDark ? "hsl(var(--accent-900))" : "#1c1c1e";
  const eyesOpen = mood !== "cheer";
  const showPencil = mood === "write";

  return (
    <div className={cn("relative inline-flex items-start gap-0", side === "left" ? "flex-row-reverse" : "flex-row", className)}>
      {message ? (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.35, duration: 0.5, ease: [0.16, 0.84, 0.24, 1] }}
          className="relative z-[2] max-w-[230px] self-center rounded-2xl px-4 py-3 font-display text-[16px] font-medium leading-[1.35] shadow-[0_12px_28px_-12px_rgba(0,0,0,.4)]"
          style={{ background: bubbleBg, color: bubbleColor, marginRight: side === "left" ? 0 : -8, marginLeft: side === "left" ? -8 : 0 }}
        >
          {message}
          <span
            className="absolute top-[22px] border-8 border-transparent"
            style={
              side === "left"
                ? { right: "100%", borderRightColor: bubbleBg }
                : { left: "100%", borderLeftColor: bubbleBg }
            }
          />
        </motion.div>
      ) : null}
      <div className="shrink-0 animate-[bob_3.6s_ease-in-out_infinite]" style={{ width: size, height: size }}>
        <svg viewBox="0 0 150 150" className="block h-full w-full overflow-visible">
          <rect x="34" y="28" width="82" height="104" rx="20" fill="#fffdf8" />
          <rect x="34" y="28" width="82" height="104" rx="20" fill="none" stroke={onDark ? "rgba(255,255,255,.25)" : "#e4e9de"} strokeWidth="2" />
          <rect x="46" y="26" width="58" height="12" rx="6" fill="hsl(var(--accent-500))" />
          <line x1="48" y1="80" x2="102" y2="80" stroke="#e2e8dc" strokeWidth="3" strokeLinecap="round" />
          <line x1="48" y1="94" x2="102" y2="94" stroke="#e2e8dc" strokeWidth="3" strokeLinecap="round" />
          <line x1="48" y1="108" x2="86" y2="108" stroke="#e2e8dc" strokeWidth="3" strokeLinecap="round" />
          <g className="origin-[77px_58px]" style={eyesOpen ? { animation: "folhinhaBlink 4.2s infinite" } : undefined}>
            {eyesOpen ? (
              <>
                <circle cx="65" cy="58" r="5.5" fill="hsl(var(--accent-900))" />
                <circle cx="89" cy="58" r="5.5" fill="hsl(var(--accent-900))" />
              </>
            ) : (
              <>
                <path d="M59 60 q6 -8 12 0" fill="none" stroke="hsl(var(--accent-900))" strokeWidth="3.4" strokeLinecap="round" />
                <path d="M83 60 q6 -8 12 0" fill="none" stroke="hsl(var(--accent-900))" strokeWidth="3.4" strokeLinecap="round" />
              </>
            )}
          </g>
          <path d={MOUTHS[mood]} fill="none" stroke="hsl(var(--accent-500))" strokeWidth="3" strokeLinecap="round" />
          {showPencil ? (
            <g transform="rotate(24 122 96)">
              <rect x="116" y="72" width="11" height="42" rx="3" fill="hsl(var(--accent-500))" />
              <path d="M116 114 h11 l-5.5 10z" fill="hsl(var(--accent-900))" />
            </g>
          ) : null}
        </svg>
      </div>
    </div>
  );
}
