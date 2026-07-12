import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ErrorState({
  title = "Não foi possível carregar",
  description,
  onRetry,
}: {
  title?: string;
  description: string;
  onRetry?: () => void;
}) {
  return (
    <div className="game-surface flex min-h-[220px] flex-col items-center justify-center gap-3 border-dashed bg-card p-5 text-center md:p-8">
      <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-destructive">
        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
      </div>
      <div>
        <h3 className="text-lg font-semibold tracking-normal">{title}</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      {onRetry && (
        <Button type="button" variant="outline" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
