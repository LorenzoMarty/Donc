import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/utils";

const badgeVariants = cva("inline-flex items-center rounded-full border border-border px-2.5 py-1 text-xs font-semibold", {
  variants: {
    variant: {
      default: "bg-primary/10 text-primary",
      secondary: "bg-primary/10 text-primary",
      outline: "bg-card/72 text-foreground",
      success: "bg-accent/14 text-accent",
      destructive: "bg-destructive/12 text-destructive",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
