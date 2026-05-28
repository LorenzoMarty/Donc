"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowUpRight, Plus, Search, Trash2 } from "lucide-react";

import { CompetencyBarChart, ScoreAreaChart } from "@/components/shared/charts";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingCard } from "@/components/shared/loading-card";
import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { apiFetch, type Essay, type EssayHistory } from "@/services/api";
import { cn } from "@/utils";

type StatusFilter = "all" | "draft" | "corrected";

const statusLabel: Record<Essay["status"], string> = {
  draft: "Rascunho",
  submitted: "Enviada",
  corrected: "Corrigida",
};

export default function EssayHistoryPage() {
  const [history, setHistory] = useState<EssayHistory | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [busyAction, setBusyAction] = useState("");
  const [actionError, setActionError] = useState("");

  const loadHistory = useCallback(() => {
    return apiFetch<EssayHistory>("/essays/history").then(setHistory);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const filteredEssays = useMemo(() => {
    if (!history) return [];
    const normalizedQuery = query.trim().toLowerCase();
    return (history.essays ?? []).filter((essay) => {
      const matchesQuery =
        !normalizedQuery ||
        essay.title.toLowerCase().includes(normalizedQuery) ||
        essay.theme.title.toLowerCase().includes(normalizedQuery) ||
        essay.correction?.recurrent_patterns.join(" ").toLowerCase().includes(normalizedQuery);
      const matchesStatus = filter === "all" || essay.status === filter;
      return matchesQuery && matchesStatus;
    });
  }, [filter, history, query]);

  const latest = history?.essays?.[0];

  const competencyData = useMemo(() => {
    const last = history?.evolution?.at(-1);
    return [
      { competency: "C1", value: last?.c1 ?? 0 },
      { competency: "C2", value: last?.c2 ?? 0 },
      { competency: "C3", value: last?.c3 ?? 0 },
      { competency: "C4", value: last?.c4 ?? 0 },
      { competency: "C5", value: last?.c5 ?? 0 },
    ];
  }, [history]);

  async function runAction(key: string, action: () => Promise<void>) {
    setBusyAction(key);
    setActionError("");
    try {
      await action();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Nao foi possivel concluir a acao.");
    } finally {
      setBusyAction("");
    }
  }

  if (!history) return <LoadingCard />;
  const essays = history.essays ?? [];
  const evolution = history.evolution ?? [];
  const averageScore = history.average_score ?? 0;
  const weakestCompetency = history.weakest_competency ?? "Sem dados";

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Workspace de escrita"
        title="Redacoes, versoes e revisoes"
        description="Continue rascunhos, compare evolucao e reescreva textos corrigidos."
        action={
          <Button asChild size="lg" className="w-full md:w-auto">
            <Link href="/redacao">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nova redacao
            </Link>
          </Button>
        }
      />

      <div className="fluid-grid gap-3 [--grid-min:15rem]">
        <Surface>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Media geral</p>
          <p className="mt-2 text-3xl font-semibold tracking-normal">{averageScore || "--"}</p>
          <Progress value={averageScore / 10} className="mt-3" />
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Indicador academico principal da sua evolucao.</p>
        </Surface>
        <Surface>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Ponto de foco</p>
          <p className="mt-2 text-2xl font-semibold tracking-normal">{weakestCompetency}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Use isso para priorizar a proxima revisao.</p>
        </Surface>
        <Surface>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Ultima atividade</p>
          <p className="text-safe mt-2 text-lg font-semibold tracking-normal">{latest?.title ?? "Sem textos"}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{latest ? formatDate(latest.updated_at) : "Comece pelo editor."}</p>
        </Surface>
      </div>

      {essays.length === 0 ? (
        <EmptyState title="Nenhuma redacao registrada" description="Comece pelo editor para ativar sua linha de evolucao." />
      ) : (
        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_minmax(19rem,24rem)]">
          <Surface>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-semibold tracking-normal">Biblioteca</h2>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative min-w-0 sm:w-[min(100vw,280px)]">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar por tema, titulo ou erro"
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2">
                  {(["all", "draft", "corrected"] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setFilter(item)}
                      className={cn(
                        "game-chip min-h-9 px-3 text-xs font-semibold transition-colors",
                        filter === item ? "bg-primary text-primary-foreground" : "bg-background/70 text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {item === "all" ? "Todas" : item === "draft" ? "Rascunhos" : "Corrigidas"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {actionError && (
              <div className="game-tile mb-4 flex gap-2 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {actionError}
              </div>
            )}
            {filteredEssays.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Nenhum texto no filtro atual.</p>
            ) : (
              <div className="grid gap-3">
                {filteredEssays.map((essay) => (
                  <EssayWorkspaceCard
                    key={essay.id}
                    essay={essay}
                    busyAction={busyAction}
                    onDelete={() =>
                      runAction(`delete-${essay.id}`, async () => {
                        if (!window.confirm(essay.status === "draft" ? "Excluir este rascunho?" : "Excluir esta redacao e sua correcao?")) return;
                        await apiFetch<{ message: string }>(`/essays/${essay.id}`, { method: "DELETE" });
                        await loadHistory();
                      })
                    }
                  />
                ))}
              </div>
            )}
          </Surface>

          <div className="space-y-4">
            <Surface className="min-h-[280px]">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Evolucao</p>
                <h2 className="mt-1 text-xl font-semibold tracking-normal">Linha de notas</h2>
              </div>
              <ScoreAreaChart data={evolution} />
            </Surface>

            <Surface>
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Ultima correcao</p>
                <h2 className="mt-1 text-xl font-semibold tracking-normal">Competencias</h2>
              </div>
              <CompetencyBarChart data={competencyData} />
            </Surface>
          </div>
        </div>
      )}
    </div>
  );
}

function EssayWorkspaceCard({ essay, busyAction, onDelete }: { essay: Essay; busyAction: string; onDelete: () => void }) {
  const score = essay.score ?? 0;
  const busy = busyAction.endsWith(`-${essay.id}`);
  const href = essay.status === "corrected" ? `/redacao?essayId=${essay.id}&view=analise` : `/redacao?essayId=${essay.id}`;
  const paragraphCount = essay.paragraph_count ?? countParagraphs(essay.content);
  const lineCount = essay.line_count ?? countLines(essay.content);
  const versionCount = essay.versions?.length || 1;

  return (
    <article className="game-tile bg-background/56 p-3 transition-colors hover:bg-muted/62">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={essay.status === "corrected" ? "secondary" : "outline"}>{statusLabel[essay.status]}</Badge>
          <Badge variant="outline">
            {versionCount} versao{versionCount > 1 ? "es" : ""}
          </Badge>
          {essay.score ? <Badge variant="success">{essay.score}</Badge> : null}
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">{formatDate(essay.updated_at)}</span>
      </div>
      <h3 className="text-safe mt-2 text-base font-semibold tracking-normal">{essay.title}</h3>
      <p className="text-safe mt-1 text-sm text-muted-foreground">{essay.theme.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{paragraphCount} paragrafos · {lineCount} linhas</p>

      {essay.correction && (
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>Dominio</span>
            <span>{score}/1000</span>
          </div>
          <Progress value={score / 10} />
          <p className="text-safe mt-2 text-sm leading-6 text-muted-foreground">{essay.correction.feedback}</p>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <Button asChild size="sm">
          <Link href={href}>
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            {essay.status === "draft" ? "Continuar" : "Abrir versoes"}
          </Link>
        </Button>
        <Button type="button" size="icon" variant="outline" onClick={onDelete} disabled={busy} aria-label="Excluir redacao">
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </article>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(value));
}

function countParagraphs(value: string) {
  const stripped = value.trim();
  if (!stripped) return 0;
  if (/\n\s*\n/.test(stripped)) {
    return stripped.split(/\n\s*\n+/).filter((paragraph) => paragraph.trim()).length;
  }
  return stripped.split(/\n+/).filter((line) => line.trim()).length;
}

function countLines(value: string) {
  const stripped = value.trim();
  if (!stripped) return 0;
  return stripped.split(/\n/).length;
}
