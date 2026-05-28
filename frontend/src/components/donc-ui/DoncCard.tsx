"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/utils";

const cardVariants = cva(
  "min-w-0 rounded-[var(--radius)] border border-border bg-card transition-all duration-200",
  {
    variants: {
      variant: {
        default: "shadow-[var(--shadow-soft)]",
        highlighted: "border-primary/40 shadow-[var(--shadow-control)] ring-1 ring-primary/20",
        primary: "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-control)]",
      },
      hoverable: {
        true: "cursor-pointer hover:-translate-y-0.5 hover:shadow-[var(--shadow-control)]",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      hoverable: false,
    },
  },
);

type DoncCardProps = VariantProps<typeof cardVariants> & {
  children: ReactNode;
  className?: string;
  delay?: number;
  onClick?: () => void;
};

function DoncCardRoot({ children, className, variant, hoverable, delay = 0, onClick }: DoncCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay, ease: [0.16, 1, 0.3, 1] }}
      className={cn(cardVariants({ variant, hoverable }), className)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      {children}
    </motion.div>
  );
}

function DoncCardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("border-b border-border/60 px-4 py-3", className)}>
      {children}
    </div>
  );
}

function DoncCardBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("p-4", className)}>
      {children}
    </div>
  );
}

function DoncCardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("border-t border-border/60 px-4 py-3", className)}>
      {children}
    </div>
  );
}

export const DoncCard = Object.assign(DoncCardRoot, {
  Header: DoncCardHeader,
  Body: DoncCardBody,
  Footer: DoncCardFooter,
});
