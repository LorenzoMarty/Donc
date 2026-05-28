"use client";

import type { ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius)] font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-[var(--shadow-soft)] hover:brightness-105 hover:-translate-y-px active:translate-y-0 active:shadow-none",
        secondary:
          "bg-secondary text-secondary-foreground hover:brightness-110 hover:-translate-y-px active:translate-y-0",
        outline:
          "border border-border bg-card text-foreground hover:bg-muted hover:-translate-y-px active:translate-y-0",
        ghost:
          "text-foreground hover:bg-muted active:bg-muted/80",
        destructive:
          "bg-destructive text-destructive-foreground hover:brightness-105 hover:-translate-y-px",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-11 px-5 text-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type DoncButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function DoncButton({ className, variant, size, ...props }: DoncButtonProps) {
  return (
    <button
      type="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
