import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { HUBS } from "@/features/gamification/symptoms";
import type { NextRecommendedAction } from "@/services/api";

const ACTION_TYPE_LABEL: Record<NextRecommendedAction["type"], string> = {
  LESSON: "Aula recomendada",
  EXERCISE: "Exercício recomendado",
  GAME: "Treino recomendado",
  ESSAY: "Sua próxima redação",
};

function nextActionTitle(action: NextRecommendedAction): string {
  if (action.type === "GAME" && action.target) {
    return HUBS[action.target as keyof typeof HUBS]?.label ?? "Treino recomendado";
  }
  return ACTION_TYPE_LABEL[action.type];
}

function nextActionHref(action: NextRecommendedAction): string {
  switch (action.type) {
    case "LESSON":
      return action.target ? `/aulas/${action.target}` : "/aulas";
    case "GAME":
      return action.target ? `/games/${action.target}` : "/games";
    case "EXERCISE":
      return "/aulas";
    case "ESSAY":
    default:
      return "/redacao";
  }
}

/** Card de "próximo treino" — mesma recomendação (`RecommendationEngine`, `GET /dashboard` ou
 * `GET /ai/recommended-actions`) usada por Dashboard, Games e Perfil; nenhuma lógica de
 * priorização é recalculada aqui, só apresentação. */
export function NextActionCard({ action }: { action: NextRecommendedAction }) {
  return (
    <div className="flex items-center justify-between gap-6 rounded-card bg-card p-6 shadow-soft">
      <div className="min-w-0 max-w-2xl">
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--accent-700))]">Seu próximo treino</p>
        <p className="font-display mt-1.5 text-[22px] font-medium leading-snug">{nextActionTitle(action)}</p>
        <p className="mt-1 text-[13px] text-muted-foreground">{action.reason}</p>
        <p className="mt-2.5 text-[12px] font-semibold text-foreground/70">~{action.estimated_minutes} min</p>
      </div>
      <Link
        href={nextActionHref(action)}
        className="flex h-11 shrink-0 items-center gap-2 rounded-control bg-[hsl(var(--accent-600))] px-5 text-[14px] font-bold text-primary-foreground transition-colors hover:bg-[hsl(var(--accent-600))]/90"
      >
        Começar
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
