"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";

import { cn } from "@/utils";

const config = {
  success: {
    icon: CheckCircle2,
    bg: "bg-emerald-50 border-emerald-200 text-emerald-800",
    iconColor: "text-emerald-600",
  },
  error: {
    icon: AlertCircle,
    bg: "bg-destructive/8 border-destructive/25 text-destructive",
    iconColor: "text-destructive",
  },
  warning: {
    icon: TriangleAlert,
    bg: "bg-primary/10 border-primary/30 text-foreground",
    iconColor: "text-primary",
  },
  info: {
    icon: Info,
    bg: "bg-primary/10 border-primary/30 text-foreground",
    iconColor: "text-primary",
  },
} as const;

type FeedbackType = keyof typeof config;

export function DoncFeedback({
  type = "info",
  children,
  dismissible = false,
  className,
}: {
  type?: FeedbackType;
  children: ReactNode;
  dismissible?: boolean;
  className?: string;
}) {
  const [visible, setVisible] = useState(true);
  const { icon: Icon, bg, iconColor } = config[type];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "flex items-start gap-3 rounded-[var(--radius)] border p-3 text-sm font-medium",
            bg,
            className,
          )}
          role="alert"
        >
          <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconColor)} aria-hidden="true" />
          <div className="min-w-0 flex-1">{children}</div>
          {dismissible && (
            <button
              type="button"
              onClick={() => setVisible(false)}
              className="ml-auto shrink-0 opacity-60 hover:opacity-100"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
