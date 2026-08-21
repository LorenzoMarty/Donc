"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDownUp, ArrowRight, CheckCircle2, Clock3, PenLine, Plus, Search, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingCard } from "@/components/shared/loading-card";
import { PageHeader } from "@/components/shared/premium-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, type Essay, type EssayHistory } from "@/services/api";
import { cn } from "@/utils";

type StatusFilter = "all" | "draft" | "submitted" | "corrected";

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "corrected", label: "Corrigidas" },
  { id: "submitted", label: "Aguardando" },
  { id: "draft", label: "Rascunhos" },
];

export default function EssayHistoryPage() {
  const [history, setHistory] = useState<EssayHistory | null>(null);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [sortAsc, setSortAsc] = useState(false);
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
    () =>
      [...(history?.essays ?? [])].sort((a, b) => {
        const diff = new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        return sortAsc ? -diff : diff;
      }),
    [history, sortAsc],
  );

  const averageScore = useMemo(() => {
    const scored = essays.filter((essay) => essay.score !== null).map((essay) => essay.score as number);
    if (!scored.length) return null;
    return Math.round(scored.reduce((sum, value) => sum + value, 0) / scored.length);
  }, [essays]);

  const counts = useMemo(
    () => ({
      all: essays.length,
      corrected: essays.filter((essay) => essay.status === "corrected").length,
      submitted: essays.filter((essay) => essay.status === "submitted").length,
      draft: essays.filter((essay) => essay.status === "draft").length,
    }),
    [essays],
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
      setActionError(error instanceof Error ? error.message : "Não foi possível concluir a ação.");
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
        title="Minhas redações"
        description={`${essays.length} ${essays.length === 1 ? "redação" : "redações"}${averageScore ? ` · nota média ${averageScore}` : ""}`}
        action={
          <Button asChild className="w-full md:w-auto">
            <Link href="/redacao">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nova redação
            </Link>
          </Button>
        }
      />

      <section className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-[260px]">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por tema…"
            className="rounded-control pl-9 text-[14px]"
          />
        </div>
        <button
          type="button"
          onClick={() => setSortAsc((value) => !value)}
          className="flex items-center gap-2 rounded-control border border-border bg-card px-3.5 py-2.5 text-[14px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowDownUp className="h-4 w-4" aria-hidden="true" />
          Ordenar
        </button>
      </section>

      <div className="mt-5 inline-flex gap-1 rounded-control bg-muted/60 p-1">
        {FILTERS.map((item) => {
          const active = filter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                active ? "bg-card text-foreground shadow-soft" : "text-muted-foreground",
              )}
            >
              {item.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-px text-[11px] font-bold",
                  active ? "bg-primary/14 text-primary" : "bg-muted-foreground/15 text-muted-foreground",
                )}
              >
                {counts[item.id]}
              </span>
            </button>
          );
        })}
      </div>

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
        <section className="mt-4 flex flex-col gap-3">
          {filteredEssays.length === 0 ? (
            <div className="rounded-card bg-card px-5 py-10 text-center shadow-soft">
              <p className="text-base font-semibold">Não achei nenhuma redação com esse filtro.</p>
              <p className="mt-1 text-sm text-muted-foreground">Tenta outro termo de busca ou limpa o filtro.</p>
            </div>
          ) : (
            filteredEssays.map((essay) => (
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
            ))
          )}
        </section>
      )}
    </div>
  );
}

const STATUS_META = {
  corrected: { label: "Corrigida", icon: CheckCircle2, tint: "bg-primary/12 text-primary" },
  submitted: { label: "Aguardando", icon: Clock3, tint: "bg-streak-tint text-streak" },
  draft: { label: "Rascunho", icon: PenLine, tint: "bg-muted text-muted-foreground" },
} as const;

function EssayRow({ essay, busy, onDelete }: { essay: Essay; busy: boolean; onDelete: () => void }) {
  const href = `/redacao?essayId=${essay.id}`;
  const status = STATUS_META[essay.status];
  const StatusIcon = status.icon;
  const actionLabel = essay.status === "corrected" ? "Ver correção" : essay.status === "draft" ? "Continuar" : "Acompanhar";
  const comps = essay.correction
    ? [
        essay.correction.competency_1,
        essay.correction.competency_2,
        essay.correction.competency_3,
        essay.correction.competency_4,
        essay.correction.competency_5,
      ]
    : [];

  return (
    <article className="flex items-center gap-5 rounded-card bg-card px-5 py-4.5 shadow-soft">
      <div
        className={cn(
          "grid h-[72px] w-[72px] shrink-0 place-items-center rounded-control",
          essay.status === "corrected" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        <span className="text-[22px] font-bold leading-none tabular-nums">{essay.score ?? "—"}</span>
        <span className="mt-0.5 text-[10px] font-semibold opacity-70">
          {essay.status === "corrected" ? "/1000" : essay.status === "submitted" ? "em análise" : "não enviada"}
        </span>
      </div>

      <Link href={href} className="min-w-0 flex-1">
        <h2 className="font-display text-[18px] font-medium leading-tight">{essay.title}</h2>
        <div className="mt-1.5 flex flex-wrap items-center gap-3.5 text-[13px] text-muted-foreground">
          <span>{formatDate(essay.updated_at)}</span>
          <span>{essay.word_count} palavras</span>
          {comps.length ? (
            <span className="flex items-center gap-[3px]">
              {comps.map((value, index) => (
                <span
                  key={index}
                  className={cn(
                    "h-[5px] w-3.5 rounded-full",
                    value >= 200 ? "bg-primary" : value >= 180 ? "bg-primary/55" : "bg-muted-foreground/30",
                  )}
                />
              ))}
            </span>
          ) : null}
        </div>
      </Link>

      <div className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold", status.tint)}>
        <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
        {status.label}
      </div>

      <Link
        href={href}
        className={cn(
          "flex shrink-0 items-center gap-1.5 rounded-control px-3.5 py-2 text-[13px] font-semibold",
          essay.status === "corrected" ? "bg-primary/10 text-primary" : "bg-muted text-foreground/70",
        )}
      >
        {actionLabel}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>

      <Button type="button" size="icon" variant="ghost" onClick={onDelete} disabled={busy} aria-label="Excluir redação" className="h-9 w-9 shrink-0">
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </Button>
    </article>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(value));
}
