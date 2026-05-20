import { Sparkles } from "lucide-react";

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="game-surface flex min-h-[240px] flex-col items-center justify-center border-dashed bg-card p-8 text-center">
      <div className="mb-4 rounded-md border border-primary/20 bg-primary/10 p-3 text-secondary">
        <Sparkles className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold tracking-normal">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
