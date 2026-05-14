import { cn } from "@/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-2xl border-2 border-foreground/20 bg-muted", className)} {...props} />;
}
