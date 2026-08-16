import { HeartPulse } from "lucide-react";

import { contentQualityTotal } from "@/app/(app)/admin/_tabs/overview-metrics";
import { Badge } from "@/components/ui/badge";
import { HUBS } from "@/features/gamification/symptoms";
import type {
  AdminAdaptiveHealth,
  AdminContentQuality,
  IssueWithoutProgressItem,
  RecommendationWithoutContentItem,
  StudentHealthItem,
} from "@/types/api";

const HUB_FOR_ISSUE: Record<string, keyof typeof HUBS> = {
  TEXT_ROBOTIC: "texto-robotico",
  REPETITIVE_IDEAS: "repete-ideias",
  WEAK_REPERTOIRE: "repertorio-nao-encaixa",
  SHALLOW_ARGUMENTATION: "nao-aprofunda",
  WEAK_THESIS: "introducao-sem-tese",
  C3_LOW: "perde-na-c3",
  FORMULAIC_CONCLUSION: "conclusao-formula",
};

function issueLabel(code: string): string {
  const hub = HUB_FOR_ISSUE[code];
  return hub ? HUBS[hub].label : code;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function HealthPanel({ title, count, empty, children }: { title: string; count: number; empty: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card bg-card p-4 shadow-soft">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{title}</p>
        <Badge variant={count ? "destructive" : "outline"} className="text-xs">
          {count}
        </Badge>
      </div>
      {count ? children : <p className="text-xs text-muted-foreground">{empty}</p>}
    </div>
  );
}

function StudentList({ items }: { items: StudentHealthItem[] }) {
  return (
    <ul className="space-y-1 text-xs text-muted-foreground">
      {items.slice(0, 12).map((item) => (
        <li key={item.user_id} className="truncate">
          {item.name} <span className="text-muted-foreground/70">— {item.email}</span>
        </li>
      ))}
      {items.length > 12 ? <li className="italic">+{items.length - 12} outros</li> : null}
    </ul>
  );
}

/** REQ-14..16 (P2c): saúde do sistema adaptativo — revela buracos concretos (quais alunos, quais
 * problemas), não só contagem agregada. Deriva de StudentLearningProfile/RecommendationLog.
 * REQ-15: consolida um resumo da saúde do conteúdo (aba "Qualidade", P1) nesta mesma visão, sem
 * duplicar as listas detalhadas — só um link direto pra quem quiser o detalhe. */
export function AdaptiveHealthTab({
  report,
  contentQuality,
  onOpenContentQuality,
}: {
  report: AdminAdaptiveHealth;
  contentQuality: AdminContentQuality;
  onOpenContentQuality: () => void;
}) {
  const contentIssues = contentQualityTotal(contentQuality);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-card bg-primary/5 p-3.5 text-sm text-muted-foreground shadow-soft">
        <HeartPulse className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        Alunos e problemas listados aqui indicam falhas no ciclo diagnóstico → recomendação → treino → resultado.
      </div>

      <button
        type="button"
        onClick={onOpenContentQuality}
        className="flex w-full items-center justify-between gap-2 rounded-card bg-card p-4 text-left shadow-soft transition-colors hover:bg-muted/40"
      >
        <div>
          <p className="text-sm font-semibold">Saúde do conteúdo</p>
          <p className="text-xs text-muted-foreground">Aulas, exercícios e jogos sem objetivo, sem uso, rejeitados ou editados após geração.</p>
        </div>
        <Badge variant={contentIssues ? "destructive" : "outline"} className="shrink-0 text-xs">
          {contentIssues} · ver na aba Qualidade
        </Badge>
      </button>

      <div className="grid gap-4 md:grid-cols-2">
        <HealthPanel
          title="Alunos sem diagnóstico"
          count={report.students_without_diagnosis.length}
          empty="Todos os alunos com atividade já têm ao menos um problema cognitivo detectado."
        >
          <StudentList items={report.students_without_diagnosis} />
        </HealthPanel>

        <HealthPanel
          title="Alunos com diagnóstico mas sem recomendação exibida"
          count={report.students_without_recommendation.length}
          empty="Todo aluno com diagnóstico já recebeu ao menos uma recomendação."
        >
          <StudentList items={report.students_without_recommendation} />
        </HealthPanel>

        <HealthPanel
          title="Problemas sem nenhum conteúdo associado"
          count={report.issues_without_content.length}
          empty="Todo problema cognitivo tem aula, exercício ou jogo que o treina."
        >
          <ul className="flex flex-wrap gap-1.5">
            {report.issues_without_content.map((code) => (
              <li key={code}>
                <Badge variant="destructive" className="text-xs">
                  {issueLabel(code)}
                </Badge>
              </li>
            ))}
          </ul>
        </HealthPanel>

        <HealthPanel
          title="Recomendações mostradas sem conteúdo alvo"
          count={report.recommendations_without_content.length}
          empty="Toda recomendação exibida apontou para um conteúdo concreto."
        >
          <RecommendationList items={report.recommendations_without_content} />
        </HealthPanel>
      </div>

      <HealthPanel
        title="Problemas sem evolução de estado há 30+ dias"
        count={report.issues_without_progress.length}
        empty="Nenhum problema ativo está estagnado."
      >
        <IssueProgressList items={report.issues_without_progress} />
      </HealthPanel>
    </div>
  );
}

function RecommendationList({ items }: { items: RecommendationWithoutContentItem[] }) {
  return (
    <ul className="space-y-1 text-xs text-muted-foreground">
      {items.slice(0, 12).map((item) => (
        <li key={item.id} className="truncate">
          Aluno #{item.user_id} — {item.action_type}
          {item.target_issue ? ` (${issueLabel(item.target_issue)})` : " (sem problema ativo)"}
        </li>
      ))}
      {items.length > 12 ? <li className="italic">+{items.length - 12} outras</li> : null}
    </ul>
  );
}

function IssueProgressList({ items }: { items: IssueWithoutProgressItem[] }) {
  return (
    <ul className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
      {items.slice(0, 20).map((item) => (
        <li key={`${item.user_id}-${item.code}`} className="truncate">
          Aluno #{item.user_id} — {issueLabel(item.code)} ({item.state}, desde {formatDate(item.updated_at)})
        </li>
      ))}
      {items.length > 20 ? <li className="italic">+{items.length - 20} outros</li> : null}
    </ul>
  );
}
