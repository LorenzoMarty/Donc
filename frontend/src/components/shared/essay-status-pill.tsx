import type { Essay } from "@/services/api";
import { cn } from "@/utils";

const ESSAY_STATUS_LABEL: Record<Essay["status"], string> = {
  draft: "Rascunho",
  submitted: "Em análise",
  corrected: "Corrigida",
};

export function essayStatusLabel(status: Essay["status"]): string {
  return ESSAY_STATUS_LABEL[status];
}

export function EssayStatusPill({ status, className }: { status: Essay["status"]; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold",
        status === "corrected" && "bg-primary/10 text-primary",
        status === "submitted" && "bg-primary/10 text-primary",
        status === "draft" && "bg-muted text-muted-foreground",
        className,
      )}
    >
      {ESSAY_STATUS_LABEL[status]}
    </span>
  );
}
