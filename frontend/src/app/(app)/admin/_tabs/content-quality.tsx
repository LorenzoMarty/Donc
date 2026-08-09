import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { HUBS } from "@/features/gamification/symptoms";
import type { AdminContentQuality, ContentQualityItem } from "@/types/api";

const HUB_FOR_ISSUE: Record<string, keyof typeof HUBS> = {
  TEXT_ROBOTIC: "texto-robotico",
  REPETITIVE_IDEAS: "repete-ideias",
  WEAK_REPERTOIRE: "repertorio-nao-encaixa",
  SHALLOW_ARGUMENTATION: "nao-aprofunda",
  WEAK_THESIS: "introducao-sem-tese",
  C3_LOW: "perde-na-c3",
  FORMULAIC_CONCLUSION: "conclusao-formula",
};

function ItemList({ title, items }: { title: string; items: ContentQualityItem[] }) {
  return (
    <div className="rounded-card bg-card p-4 shadow-soft">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{title}</p>
        <Badge variant={items.length ? "destructive" : "outline"} className="text-xs">
          {items.length}
        </Badge>
      </div>
      {items.length ? (
        <ul className="space-y-1 text-xs text-muted-foreground">
          {items.slice(0, 12).map((item) => (
            <li key={`${item.kind}-${item.id}`} className="truncate">
              {item.label}
            </li>
          ))}
          {items.length > 12 ? <li className="italic">+{items.length - 12} outros</li> : null}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">Nenhum item — tudo em dia.</p>
      )}
    </div>
  );
}

/** REQ-29/31 (P1): visão mínima pra achar rápido conteúdo que não participa do sistema
 * adaptativo — sem redesenhar o admin, só uma aba a mais consumindo o relatório do backend. */
export function ContentQualityTab({ report }: { report: AdminContentQuality }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-card bg-primary/5 p-3.5 text-sm text-muted-foreground shadow-soft">
        <AlertTriangle className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        Conteúdo listado aqui não participa (ou participa mal) do <code>RecommendationEngine</code> — sem target, o
        motor não consegue indicá-lo; sem uso, ele nunca chegou de fato ao aluno.
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ItemList title="Aulas sem target" items={report.lessons_without_target} />
        <ItemList title="Exercícios sem target" items={report.exercises_without_target} />
        <ItemList title="Jogos IA sem target" items={report.games_without_target} />
        <ItemList title="Aulas nunca assistidas" items={report.unused_lessons} />
        <ItemList title="Exercícios nunca respondidos" items={report.unused_exercises} />
        <ItemList title="Jogos IA nunca jogados" items={report.unused_games} />
        <ItemList title="Jogos IA rejeitados" items={report.rejected_games} />
        <ItemList title="Jogos IA editados após geração" items={report.edited_games} />
      </div>

      <div className="rounded-card bg-card p-4 shadow-soft">
        <p className="mb-3 text-sm font-semibold">Conteúdo por problema cognitivo</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Problema</th>
                <th className="pb-2 pr-4 font-medium">Aulas</th>
                <th className="pb-2 pr-4 font-medium">Exercícios</th>
                <th className="pb-2 font-medium">Jogos</th>
              </tr>
            </thead>
            <tbody>
              {report.content_by_issue.map((row) => {
                const hub = HUB_FOR_ISSUE[row.code];
                const label = hub ? HUBS[hub].label : row.code;
                const total = row.lessons + row.exercises + row.games;
                return (
                  <tr key={row.code} className="border-t">
                    <td className={total ? "py-2 pr-4" : "py-2 pr-4 text-destructive"}>{label}</td>
                    <td className="py-2 pr-4 tabular-nums">{row.lessons}</td>
                    <td className="py-2 pr-4 tabular-nums">{row.exercises}</td>
                    <td className="py-2 tabular-nums">{row.games}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
