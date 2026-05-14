"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, FileText, TrendingUp, Trophy } from "lucide-react";

import { CompetencyBarChart, ScoreAreaChart } from "@/components/app/charts";
import { EmptyState } from "@/components/app/empty-state";
import { LoadingCard } from "@/components/app/loading-card";
import { PageHeader, Surface } from "@/components/app/premium-ui";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { apiFetch, type EssayHistory } from "@/lib/api";

export default function EssayHistoryPage() {
  const [history, setHistory] = useState<EssayHistory | null>(null);

  useEffect(() => {
    apiFetch<EssayHistory>("/essays/history").then(setHistory);
  }, []);

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

  if (!history) return <LoadingCard />;

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        eyebrow="Analytics de escrita"
        title="Sua evolucao em camadas"
        description="Notas, competencias e padroes recorrentes em uma visao de coaching."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Surface>
          <p className="text-xs font-black uppercase text-muted-foreground">Media geral</p>
          <p className="mt-2 text-5xl font-black tracking-normal">{history.average_score}</p>
          <Progress value={history.average_score / 10} className="mt-4" />
        </Surface>
        <Surface>
          <p className="text-xs font-black uppercase text-muted-foreground">Ponto de foco</p>
          <p className="mt-2 text-2xl font-black tracking-normal">{history.weakest_competency}</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Prioridade para a proxima rodada de escrita.</p>
        </Surface>
        <Surface>
          <p className="text-xs font-black uppercase text-muted-foreground">Redacoes</p>
          <p className="mt-2 text-5xl font-black tracking-normal">{history.essays.length}</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-md bg-secondary/14 px-3 py-2 text-xs font-black text-secondary">
            <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
            Historico ativo
          </div>
        </Surface>
      </div>

      {history.essays.length === 0 ? (
        <EmptyState title="Nenhuma redacao registrada" description="Comece pelo editor para ativar sua linha de evolucao." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Surface className="min-h-[330px]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-muted-foreground">Linha de score</p>
                <h2 className="mt-1 text-xl font-black tracking-normal">Evolucao da nota</h2>
              </div>
              <TrendingUp className="h-5 w-5 text-secondary" aria-hidden="true" />
            </div>
            <ScoreAreaChart data={history.evolution} />
          </Surface>

          <Surface className="min-h-[330px]">
            <div className="mb-4">
              <p className="text-xs font-black uppercase text-muted-foreground">Ultima banca</p>
              <h2 className="mt-1 text-xl font-black tracking-normal">Competencias</h2>
            </div>
            <CompetencyBarChart data={competencyData} />
          </Surface>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Surface>
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-secondary" aria-hidden="true" />
            <h2 className="text-lg font-black tracking-normal">Padroes recorrentes</h2>
          </div>
          <div className="space-y-2">
            {history.recurrent_errors.length ? (
              history.recurrent_errors.map((error) => (
                <div key={error} className="rounded-lg border bg-background/54 p-3 text-sm text-muted-foreground">
                  {error}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Ainda nao ha padroes suficientes.</p>
            )}
          </div>
        </Surface>

        <Surface>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-black tracking-normal">Timeline</h2>
            <FileText className="h-5 w-5 text-secondary" aria-hidden="true" />
          </div>
          <div className="space-y-3">
            {history.essays.map((essay) => (
              <div key={essay.id} className="flex flex-col gap-3 rounded-lg border bg-background/54 p-4 transition-colors hover:bg-muted/62 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-black">{essay.title}</p>
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{essay.theme.title}</p>
                </div>
                <Badge variant={essay.status === "corrected" ? "secondary" : "outline"}>{essay.score ?? "Rascunho"}</Badge>
              </div>
            ))}
          </div>
        </Surface>
      </div>
    </div>
  );
}

