import * as React from "react";

import { cn } from "@/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-12 w-full rounded-2xl border-2 border-foreground bg-background px-4 py-2 text-sm font-semibold outline-none shadow-[0_3px_0_hsl(var(--foreground))] transition-all placeholder:text-muted-foreground focus-visible:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
