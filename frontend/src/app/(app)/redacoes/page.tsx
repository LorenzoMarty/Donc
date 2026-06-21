"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Plus, Search, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { LoadingCard } from "@/components/shared/loading-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, type Essay, type EssayHistory } from "@/services/api";
import { cn } from "@/utils";

type StatusFilter = "all" | "draft" | "submitted" | "corrected";

const statusLabel: Record<Essay["status"], string> = {
  draft: "Rascunho",
  submitted: "Em analise",
  corrected: "Corrigida",
};

const filters: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "draft", label: "Rascunhos" },
  { id: "submitted", label: "Em analise" },
  { id: "corrected", label: "Corrigidas" },
];

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

  if (!history) return <LoadingCard />;

  return (
    <div className="text-foreground">
      <header className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Historico</p>
          <h1 className="mt-1 text-3xl font-bold tracking-normal">Redacoes escritas</h1>
          <p className="mt-1 text-base text-muted-foreground">
            {essays.length} redacao{essays.length === 1 ? "" : "es"} registradas
          </p>
        </div>
        <Button asChild className="w-full md:w-auto">
          <Link href="/redacao">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nova redacao
          </Link>
        </Button>
      </header>

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
                "min-h-9 rounded-md border px-3 text-sm font-semibold transition-colors",
                filter === item.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-white text-muted-foreground hover:bg-muted/60 hover:text-foreground",
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
          <EmptyState title="Nenhuma redação ainda" description="Escreva sua primeira redação no editor para começar o histórico." />
        </div>
      ) : (
        <section className="mt-5 overflow-hidden rounded-md border border-border bg-white">
          {filteredEssays.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-base font-semibold">Nenhuma redação encontrada.</p>
              <p className="mt-1 text-sm text-muted-foreground">Tente outros termos de busca ou mude o filtro.</p>
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
                      if (!window.confirm(essay.status === "draft" ? "Excluir este rascunho?" : "Excluir esta redacao e sua correcao?"))
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
    <article className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 transition-colors hover:bg-primary/5 md:px-5">
      <Link href={href} className="grid min-w-0 gap-1 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-5">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold tracking-normal">{essay.title}</h2>
          <p className="mt-1 truncate text-sm text-muted-foreground">{essay.theme.title}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          {essay.score ? <span className="rounded-md bg-primary/10 px-2.5 py-1 text-sm font-bold text-primary">{essay.score}</span> : null}
          <span
            className={cn(
              "rounded-md px-2.5 py-1 text-sm font-semibold",
              essay.status === "corrected" && "bg-primary/10 text-primary",
              essay.status === "submitted" && "bg-primary/10 text-primary",
              essay.status === "draft" && "bg-muted text-muted-foreground",
            )}
          >
            {statusLabel[essay.status]}
          </span>
          <span className="text-sm text-muted-foreground">{formatDate(essay.updated_at)}</span>
          <span className="hidden text-sm text-muted-foreground sm:inline">{essay.word_count} palavras</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
      </Link>

      <Button type="button" size="icon" variant="ghost" onClick={onDelete} disabled={busy} aria-label="Excluir redacao" className="h-9 w-9">
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </Button>
    </article>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(value));
}
