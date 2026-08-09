import { Surface } from "@/components/shared/premium-ui";
import { HUBS } from "@/features/gamification/symptoms";
import type { CognitiveIssueRecord } from "@/services/api";

// Mesmo mapeamento issue -> hub do backend (src/services/recommendation_service.py::HUB_FOR_ISSUE)
// — usado só pra achar o título em pt-BR já existente em HUBS, não recalcula nada.
const HUB_FOR_ISSUE: Record<string, keyof typeof HUBS> = {
  TEXT_ROBOTIC: "texto-robotico",
  REPETITIVE_IDEAS: "repete-ideias",
  WEAK_REPERTOIRE: "repertorio-nao-encaixa",
  SHALLOW_ARGUMENTATION: "nao-aprofunda",
  WEAK_THESIS: "introducao-sem-tese",
  C3_LOW: "perde-na-c3",
  FORMULAIC_CONCLUSION: "conclusao-formula",
};

const STATE_DOT: Record<CognitiveIssueRecord["state"], string> = {
  DETECTED: "🔴",
  TRAINING: "🔴",
  IMPROVING: "🟡",
  MASTERED: "🟢",
};

const STATE_LABEL: Record<CognitiveIssueRecord["state"], string> = {
  DETECTED: "Detectado",
  TRAINING: "Em treino",
  IMPROVING: "Melhorando",
  MASTERED: "Dominado",
};

/** REQ-23 (P1): lista os problemas cognitivos do aluno com indicador visual por estado — mesmo
 * payload de `GET /ai/learning-profile` (`cognitive_issues`, já centralizado no P0). */
export function CognitiveIssuesSection({ issues }: { issues: Record<string, CognitiveIssueRecord> | undefined }) {
  const entries = Object.entries(issues ?? {});
  if (!entries.length) return null;

  return (
    <Surface>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Diagnóstico</p>
      <h2 className="mt-1 text-xl font-semibold tracking-normal">Seus principais pontos de atenção</h2>
      <div className="mt-4 space-y-2">
        {entries.map(([code, record]) => {
          const hub = HUB_FOR_ISSUE[code];
          const label = hub ? HUBS[hub].title : code;
          return (
            <div key={code} className="flex items-center gap-3 rounded-control bg-muted/40 px-4 py-3">
              <span aria-hidden="true">{STATE_DOT[record.state]}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{label}</span>
              <span className="shrink-0 text-xs font-semibold text-muted-foreground">{STATE_LABEL[record.state]}</span>
            </div>
          );
        })}
      </div>
    </Surface>
  );
}
