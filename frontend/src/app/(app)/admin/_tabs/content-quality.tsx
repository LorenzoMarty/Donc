import { AlertTriangle, CheckCircle2 } from "lucide-react";

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

function itemTotal(report: AdminContentQuality) {
  return [
    report.lessons_without_target,
    report.exercises_without_target,
    report.games_without_target,
    report.unused_lessons,
    report.unused_exercises,
    report.unused_games,
    report.rejected_games,
    report.edited_games,
  ].reduce((sum, items) => sum + items.length, 0);
}

function IssueList({ title, items, priority }: { title: string; items: ContentQualityItem[]; priority?: boolean }) {
  return (
    <div className="rounded-card border border-border/80 bg-card p-4 shadow-soft">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{priority ? "Afeta recomendações" : "Monitoramento"}</p>
        </div>
        <Badge variant={items.length ? (priority ? "destructive" : "secondary") : "outline"} className="text-xs">
          {items.length}
        </Badge>
      </div>
      {items.length ? (
        <ul className="grid gap-1.5 text-xs text-muted-foreground">
          {items.slice(0, 8).map((item) => (
            <li key={`${item.kind}-${item.id}`} className="truncate rounded-control bg-background/70 px-2.5 py-1.5">
              {item.label}
            </li>
          ))}
          {items.length > 8 ? <li className="px-2.5 py-1 italic">+{items.length - 8} outros</li> : null}
        </ul>
      ) : (
        <div className="flex items-center gap-2 rounded-control bg-success/10 px-2.5 py-2 text-xs text-success">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          Tudo em dia
        </div>
      )}
    </div>
  );
}

export function ContentQualityTab({ report }: { report: AdminContentQuality }) {
  const total = itemTotal(report);
  const uncoveredIssues = report.content_by_issue.filter((row) => row.lessons + row.exercises + row.games === 0).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <QualityStat label="Itens para revisar" value={total} tone={total ? "danger" : "success"} />
        <QualityStat label="Problemas sem cobertura" value={uncoveredIssues} tone={uncoveredIssues ? "danger" : "success"} />
        <QualityStat label="Problemas mapeados" value={report.content_by_issue.length} tone="neutral" />
      </div>

      <div className="rounded-card border border-border/80 bg-card p-4 shadow-soft">
        <div className="flex gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-control bg-primary/10 text-primary">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Priorize cobertura e uso real</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Conteúdo sem objetivo não entra bem nas recomendações. Conteúdo sem uso precisa ser reposicionado ou revisado.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <IssueList title="Aulas sem objetivo" items={report.lessons_without_target} priority />
        <IssueList title="Exercícios sem objetivo" items={report.exercises_without_target} priority />
        <IssueList title="Jogos IA sem objetivo" items={report.games_without_target} priority />
        <IssueList title="Aulas nunca assistidas" items={report.unused_lessons} />
        <IssueList title="Exercícios nunca respondidos" items={report.unused_exercises} />
        <IssueList title="Jogos IA nunca jogados" items={report.unused_games} />
        <IssueList title="Jogos IA rejeitados" items={report.rejected_games} />
        <IssueList title="Jogos IA editados após geração" items={report.edited_games} />
      </div>

      <div className="rounded-card border border-border/80 bg-card shadow-soft">
        <div className="border-b p-4">
          <p className="text-base font-semibold">Cobertura por problema cognitivo</p>
          <p className="mt-1 text-xs text-muted-foreground">Aulas, exercícios e jogos disponíveis para cada problema detectado.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Problema</th>
                <th className="px-4 py-3 font-medium tabular-nums">Aulas</th>
                <th className="px-4 py-3 font-medium tabular-nums">Exercícios</th>
                <th className="px-4 py-3 font-medium tabular-nums">Jogos</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {report.content_by_issue.map((row) => {
                const hub = HUB_FOR_ISSUE[row.code];
                const label = hub ? HUBS[hub].label : row.code;
                const totalForIssue = row.lessons + row.exercises + row.games;
                return (
                  <tr key={row.code} className="border-b last:border-b-0 hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium">{label}</td>
                    <td className="px-4 py-3 tabular-nums">{row.lessons}</td>
                    <td className="px-4 py-3 tabular-nums">{row.exercises}</td>
                    <td className="px-4 py-3 tabular-nums">{row.games}</td>
                    <td className="px-4 py-3">
                      <Badge variant={totalForIssue ? "outline" : "destructive"} className="text-xs">
                        {totalForIssue ? "Coberto" : "Sem cobertura"}
                      </Badge>
                    </td>
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

function QualityStat({ label, value, tone }: { label: string; value: number; tone: "danger" | "success" | "neutral" }) {
  const valueClass = tone === "danger" ? "text-destructive" : tone === "success" ? "text-success" : "text-foreground";
  return (
    <div className="rounded-card border border-border/80 bg-card p-4 shadow-soft">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tabular-nums tracking-normal ${valueClass}`}>{value.toLocaleString("pt-BR")}</p>
    </div>
  );
}
