import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/utils";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  error?: boolean;
};

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, error, children, ...props }, ref) => {
  return (
    <div className="relative">
      <select
        className={cn(
          "flex h-11 w-full appearance-none rounded-md border border-input bg-card pl-3.5 pr-9 text-base font-medium text-foreground outline-none transition-all focus-visible:border-primary/45 focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          error && "border-destructive/60 focus-visible:border-destructive/70 focus-visible:ring-destructive/15",
          className,
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
    </div>
  );
});
Select.displayName = "Select";

export { Select };
