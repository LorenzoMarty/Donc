"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Clock3, PenLine, Plus, Search, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { EssayStatusPill } from "@/components/shared/essay-status-pill";
import { LoadingCard } from "@/components/shared/loading-card";
import { PageHeader } from "@/components/shared/premium-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, type Essay, type EssayHistory } from "@/services/api";
import { cn } from "@/utils";

type StatusFilter = "all" | "draft" | "submitted" | "corrected";

const filters: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "draft", label: "Rascunhos" },
  { id: "submitted", label: "Em análise" },
  { id: "corrected", label: "Corrigidas" },
];

export default function EssayHistoryPage() {
  const [history, setHistory] = useState<EssayHistory | null>(null);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [busyAction, setBusyAction] = useState("");
  const [actionError, setActionError] = useState("");

  const loadHistory = useCallback(() => {
    return apiFetch<EssayHistory>("/essays/history")
      .then((data) => {
        setHistory(data);
        setLoadError("");
      })
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : "Não foi possível carregar suas redações.");
      });
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const essays = useMemo(
    () => [...(history?.essays ?? [])].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    [history],
  );

  const filteredEssays = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return essays.filter((essay) => {
      const matchesQuery =
        !normalizedQuery ||
        essay.title.toLowerCase().includes(normalizedQuery) ||
        essay.theme.title.toLowerCase().includes(normalizedQuery);
      const matchesStatus = filter === "all" || essay.status === filter;
      return matchesQuery && matchesStatus;
    });
  }, [essays, filter, query]);

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

  if (loadError && !history) return <ErrorState description={loadError} onRetry={loadHistory} />;
  if (!history) return <LoadingCard />;

  return (
    <div className="text-foreground">
      <PageHeader
        eyebrow="Histórico"
        title="Redações escritas"
        description={`${essays.length} ${essays.length === 1 ? "redação" : "redações"} registradas`}
        action={
          <Button asChild className="w-full md:w-auto">
            <Link href="/redacao">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nova redacao
            </Link>
          </Button>
        }
      />

      <section className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por titulo ou tema"
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={cn(
                "min-h-11 rounded-control px-3 text-sm font-semibold transition-colors",
                filter === item.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {actionError ? (
        <div className="mt-4 flex gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {actionError}
        </div>
      ) : null}

      {essays.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Seu histórico começa na primeira redação" description="Escreve no editor e ela aparece aqui, com nota e evolução ao longo do tempo." />
        </div>
      ) : (
        <section className="mt-5 overflow-hidden rounded-card bg-card shadow-soft">
          {filteredEssays.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-base font-semibold">Não achei nenhuma redação com esse filtro.</p>
              <p className="mt-1 text-sm text-muted-foreground">Tenta outro termo de busca ou limpa o filtro.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredEssays.map((essay) => (
                <EssayRow
                  key={essay.id}
                  essay={essay}
                  busy={busyAction === `delete-${essay.id}`}
                  onDelete={() =>
                    runAction(`delete-${essay.id}`, async () => {
                      if (!window.confirm(essay.status === "draft" ? "Excluir este rascunho?" : "Excluir esta redação e sua correção?"))
                        return;
                      await apiFetch<{ message: string }>(`/essays/${essay.id}`, { method: "DELETE" });
                      await loadHistory();
                    })
                  }
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function EssayRow({ essay, busy, onDelete }: { essay: Essay; busy: boolean; onDelete: () => void }) {
  const href = essay.status === "corrected" ? `/redacao?essayId=${essay.id}&view=analise` : `/redacao?essayId=${essay.id}`;

  return (
    <article className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-5 transition-colors hover:bg-primary/5 md:px-6">
      <Link href={href} className="grid min-w-0 grid-cols-[3rem_minmax(0,1fr)] items-center gap-3 md:grid-cols-[3rem_minmax(0,1fr)_auto] md:gap-5">
        <EssayScoreMark status={essay.status} score={essay.score} />

        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold tracking-normal">{essay.title}</h2>
          <p className="mt-1 truncate text-sm text-muted-foreground">{essay.theme.title}</p>
        </div>

        <div className="col-span-2 flex flex-wrap items-center gap-2 pt-2 md:col-span-1 md:justify-end md:pt-0">
          <EssayStatusPill status={essay.status} className="rounded-full" />
          <span className="text-sm text-muted-foreground">{formatDate(essay.updated_at)}</span>
          <span className="hidden text-sm text-muted-foreground sm:inline">{essay.word_count} palavras</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
      </Link>

      <Button type="button" size="icon" variant="ghost" onClick={onDelete} disabled={busy} aria-label="Excluir redacao" className="h-11 w-11">
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </Button>
    </article>
  );
}

function EssayScoreMark({ status, score }: { status: Essay["status"]; score: number | null }) {
  if (status === "corrected" && score !== null) {
    return (
      <div className="grid h-12 w-12 place-items-center rounded-control bg-primary/12 text-center text-primary">
        <span className="block text-lg font-bold leading-none tabular-nums">{score}</span>
        <span className="mt-0.5 block text-[0.6rem] font-semibold text-primary/70">/1000</span>
      </div>
    );
  }

  if (status === "submitted") {
    return (
      <div className="grid h-12 w-12 place-items-center rounded-control bg-info-tint text-info">
        <Clock3 className="h-5 w-5" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="grid h-12 w-12 place-items-center rounded-control bg-muted text-muted-foreground">
      <PenLine className="h-5 w-5" aria-hidden="true" />
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(value));
}
