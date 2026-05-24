"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  ChevronDown,
  FilePenLine,
  FileText,
  GitCompareArrows,
  History,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

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
  const [draftsOpen, setDraftsOpen] = useState(true);
  const [correctedOpen, setCorrectedOpen] = useState(true);

  const loadHistory = useCallback(() => {
    return apiFetch<EssayHistory>("/essays/history").then(setHistory);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const filteredEssays = useMemo(() => {
    if (!history) return [];
    const normalizedQuery = query.trim().toLowerCase();
    return history.essays.filter((essay) => {
      const matchesQuery =
        !normalizedQuery ||
        essay.title.toLowerCase().includes(normalizedQuery) ||
        essay.theme.title.toLowerCase().includes(normalizedQuery) ||
        essay.correction?.recurrent_patterns.join(" ").toLowerCase().includes(normalizedQuery);
      const matchesStatus = filter === "all" || essay.status === filter;
      return matchesQuery && matchesStatus;
    });
  }, [filter, history, query]);

  const drafts = filteredEssays.filter((essay) => essay.status === "draft");
  const corrected = filteredEssays.filter((essay) => essay.status === "corrected");
  const latest = history?.essays[0];

  const competencyData = useMemo(() => {
    const last = history?.evolution.at(-1);
    return [
      { competency: "C1", value: last?.c1 ?? 0 },
      { competency: "C2", value: last?.c2 ?? 0 },
      { competency: "C3", value: last?.c3 ?? 0 },
      { competency: "C4", value: last?.c4 ?? 0 },
      { competency: "C5", value: last?.c5 ?? 0 },
    ];
  }, [history]);

  const versionedEssays = useMemo(() => {
    if (!history) return [];
    return history.essays.filter((essay) => essay.versions.length > 0).slice(0, 5);
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

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        eyebrow="Workspace de escrita"
        title="Redacoes, versoes e revisoes em um so lugar."
        description="Continue rascunhos, compare evolucao e reescreva textos corrigidos sem perder o historico."
        action={
          <Button asChild size="lg" className="w-full md:w-auto">
            <Link href="/redacao">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nova redacao
            </Link>
          </Button>
        }
      />

      <div className="fluid-grid gap-4 [--grid-min:15rem]">
        <Surface>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Media geral</p>
          <p className="mt-2 text-4xl font-semibold tracking-normal">{history.average_score || "--"}</p>
          <Progress value={history.average_score / 10} className="mt-4" />
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Indicador academico principal da sua evolucao.</p>
        </Surface>
        <Surface>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Ponto de foco</p>
          <p className="mt-2 text-2xl font-semibold tracking-normal">{history.weakest_competency}</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Use isso para priorizar a proxima revisao.</p>
        </Surface>
        <Surface>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Ultima atividade</p>
          <p className="text-safe mt-2 text-xl font-semibold tracking-normal">{latest?.title ?? "Sem textos"}</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{latest ? formatDate(latest.updated_at) : "Comece pelo editor."}</p>
        </Surface>
      </div>

      <Surface>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Organizacao</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-normal">Biblioteca de textos</h2>
          </div>
          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
            <div className="relative min-w-0 md:w-[min(100vw,340px)]">
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
            <div className="grid grid-cols-3 gap-2 overflow-x-auto no-scrollbar">
              {(["all", "draft", "corrected"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={cn(
                    "game-chip min-h-10 px-3 text-sm font-semibold transition-colors",
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
          <div className="game-tile mt-4 flex gap-2 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {actionError}
          </div>
        )}
      </Surface>

      {history.essays.length === 0 ? (
        <EmptyState title="Nenhuma redacao registrada" description="Comece pelo editor para ativar sua linha de evolucao." />
      ) : (
        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_minmax(19rem,24rem)]">
          <div className="space-y-4">
            <Surface>
              <button
                type="button"
                onClick={() => setDraftsOpen((value) => !value)}
                className="mb-4 flex w-full items-center justify-between gap-3 text-left"
                aria-expanded={draftsOpen}
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Rascunhos</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-normal">Continue escrevendo</h2>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{drafts.length}</Badge>
                  <FilePenLine className="h-5 w-5 text-secondary" aria-hidden="true" />
                  <ChevronDown
                    className={cn("h-5 w-5 text-muted-foreground transition-transform", !draftsOpen && "-rotate-90")}
                    aria-hidden="true"
                  />
                </div>
              </button>
              {draftsOpen ? (
                drafts.length ? (
                  <div className="grid gap-3 lg:grid-cols-2">
                    {drafts.map((essay) => (
                      <EssayWorkspaceCard
                        key={essay.id}
                        essay={essay}
                        busyAction={busyAction}
                        onDelete={() =>
                          runAction(`delete-${essay.id}`, async () => {
                            if (!window.confirm("Excluir este rascunho?")) return;
                            await apiFetch<{ message: string }>(`/essays/${essay.id}`, { method: "DELETE" });
                            await loadHistory();
                          })
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-muted-foreground">Nenhum rascunho no filtro atual.</p>
                )
              ) : null}
            </Surface>

            <Surface>
              <button
                type="button"
                onClick={() => setCorrectedOpen((value) => !value)}
                className="mb-4 flex w-full items-center justify-between gap-3 text-left"
                aria-expanded={correctedOpen}
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Corrigidas</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-normal">Revisar, versionar e comparar</h2>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{corrected.length}</Badge>
                  <GitCompareArrows className="h-5 w-5 text-secondary" aria-hidden="true" />
                  <ChevronDown
                    className={cn("h-5 w-5 text-muted-foreground transition-transform", !correctedOpen && "-rotate-90")}
                    aria-hidden="true"
                  />
                </div>
              </button>
              {correctedOpen ? (
                corrected.length ? (
                  <div className="grid gap-3">
                    {corrected.map((essay) => (
                      <EssayWorkspaceCard
                        key={essay.id}
                        essay={essay}
                        busyAction={busyAction}
                        onDelete={() =>
                          runAction(`delete-${essay.id}`, async () => {
                            if (!window.confirm("Excluir esta redacao e sua correcao?")) return;
                            await apiFetch<{ message: string }>(`/essays/${essay.id}`, { method: "DELETE" });
                            await loadHistory();
                          })
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-muted-foreground">Nenhuma redacao corrigida no filtro atual.</p>
                )
              ) : null}
            </Surface>
          </div>

          <div className="space-y-4">
            <Surface className="min-h-[320px]">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Evolucao</p>
                <h2 className="mt-1 text-xl font-semibold tracking-normal">Linha de notas</h2>
              </div>
              <ScoreAreaChart data={history.evolution} />
            </Surface>

            <Surface>
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Ultima correcao</p>
                <h2 className="mt-1 text-xl font-semibold tracking-normal">Competencias</h2>
              </div>
              <CompetencyBarChart data={competencyData} />
            </Surface>

            <Surface>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Reescritas</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-normal">Reescritas por redacao</h2>
                </div>
                <History className="h-5 w-5 text-secondary" aria-hidden="true" />
              </div>
              <div className="space-y-3">
                {versionedEssays.map((essay) => {
                  return (
                    <div key={essay.id} className="game-tile bg-background/56 p-3">
                      <p className="text-safe text-sm font-semibold">{essay.title}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {[...essay.versions]
                          .sort((a, b) => a.version_number - b.version_number)
                          .map((version) => (
                            <span
                              key={version.id}
                              className={cn(
                                "game-chip px-2.5 py-1 text-xs font-semibold",
                                version.correction ? "bg-primary/12 text-secondary" : "bg-muted text-muted-foreground",
                              )}
                            >
                              Versao {version.version_number} {version.score ? `- ${version.score}` : ""}
                            </span>
                          ))}
                      </div>
                      <Button asChild size="sm" variant="outline" className="mt-3 w-full">
                        <Link href={`/redacao?essayId=${essay.id}`}>Abrir versoes</Link>
                      </Button>
                    </div>
                  );
                })}
              </div>
            </Surface>

            <Surface>
              <div className="mb-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-secondary" aria-hidden="true" />
                <h2 className="text-lg font-semibold tracking-normal">Erros recorrentes</h2>
              </div>
              <div className="space-y-2">
                {history.recurrent_errors.length ? (
                  history.recurrent_errors.map((error) => (
                    <div key={error} className="game-tile bg-background/56 p-3 text-sm leading-6 text-muted-foreground">
                      {error}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Ainda nao ha padroes suficientes.</p>
                )}
              </div>
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

  return (
    <article className="game-tile bg-background/56 p-4 transition-colors hover:bg-muted/62">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={essay.status === "corrected" ? "secondary" : "outline"}>{statusLabel[essay.status]}</Badge>
            <Badge variant="outline">
              {essay.versions.length || 1} versao{(essay.versions.length || 1) > 1 ? "es" : ""}
            </Badge>
            {essay.score ? <Badge variant="success">{essay.score}</Badge> : null}
          </div>
          <h3 className="text-safe mt-3 text-lg font-semibold tracking-normal">{essay.title}</h3>
          <p className="text-safe mt-2 text-sm leading-6 text-muted-foreground">{essay.theme.title}</p>
        </div>
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-md border border-primary/25 bg-primary/12 text-secondary">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Metric label="Linhas" value={essay.line_count.toString()} />
        <Metric label="Atualizado" value={formatDate(essay.updated_at)} />
      </div>

      {essay.correction && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>Dominio por nota</span>
            <span>{score}/1000</span>
          </div>
          <Progress value={score / 10} />
          <p className="text-safe mt-3 text-sm leading-6 text-muted-foreground">{essay.correction.feedback}</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href={`/redacao?essayId=${essay.id}`}>
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card/70 px-3 py-2">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(value));
}
