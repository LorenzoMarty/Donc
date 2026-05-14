import { Sparkles } from "lucide-react";

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="glass-surface flex min-h-[240px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
      <div className="mb-4 rounded-lg bg-secondary/18 p-3 text-secondary shadow-glow">
        <Sparkles className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-black tracking-normal">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
