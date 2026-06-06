import type { ReactNode } from "react";

import { cn } from "@/utils";

type FieldProps = {
  label?: string;
  hint?: string;
  error?: string | null;
  /** Shows a `current / max` character counter aligned to the right. */
  counter?: { value: number; max: number };
  required?: boolean;
  className?: string;
  children: ReactNode;
};

export function Field({ label, hint, error, counter, required, className, children }: FieldProps) {
  const nearLimit = counter ? counter.value >= counter.max * 0.9 : false;
  const showFooter = Boolean(error || hint || counter);

  return (
    <label className={cn("grid gap-1.5", className)}>
      {label ? (
        <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
          {label}
          {required ? <span className="text-destructive">*</span> : null}
        </span>
      ) : null}
      {children}
      {showFooter ? (
        <span className="flex items-center justify-between gap-2 text-[0.7rem] leading-4">
          <span className={cn("font-medium", error ? "text-destructive" : "text-muted-foreground")}>{error || hint || ""}</span>
          {counter ? (
            <span className={cn("shrink-0 tabular-nums", nearLimit ? "font-semibold text-amber-600" : "text-muted-foreground")}>
              {counter.value}/{counter.max}
            </span>
          ) : null}
        </span>
      ) : null}
    </label>
  );
}
