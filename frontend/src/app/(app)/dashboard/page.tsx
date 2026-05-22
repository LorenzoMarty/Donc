"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, ArrowRight, CalendarDays, FileText, PenLine, Target } from "lucide-react";

import { CompetencyBarChart, ScoreAreaChart } from "@/components/shared/charts";
import { LoadingCard } from "@/components/shared/loading-card";
import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { apiFetch, type Dashboard } from "@/services/api";

const competencySnapshot = [
  { competency: "C1", value: 152 },
  { competency: "C2", value: 168 },
  { competency: "C3", value: 142 },
  { competency: "C4", value: 136 },
  { competency: "C5", value: 160 },
];

const recurrentErrors = [
  "Conectivos conclusivos repetidos no desenvolvimento.",
  "Repertorio citado sem amarracao clara com a tese.",
  "Proposta de intervencao com meio pouco detalhado.",
];

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);

  useEffect(() => {
    apiFetch<Dashboard>("/dashboard").then(setData);
  }, []);

  const weeklyEvolution = useMemo(() => {
    if (!data?.trend.length) return 0;
    const first = data.trend[0]?.score ?? 0;
    const last = data.trend.at(-1)?.score ?? first;
    return last - first;
  }, [data]);

  if (!data) {
    return (
      <div className="fluid-grid gap-4 [--grid-min:16rem]">
        <LoadingCard />
        <LoadingCard />
        <LoadingCard />
        <LoadingCard />
      </div>
    );
  }

  const nextLesson = data.recent_lessons[0];
  const nextExercise = data.pending_exercises[0];
  const consistency = Math.min(100, Math.round((data.streak_days / 7) * 100));

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        eyebrow="Painel academico"
        title="Evolucao da sua escrita"
        description="Acompanhe rotina, notas, competencias e proximas praticas com foco em melhoria real de redacao ENEM."
        action={
          <Button asChild size="lg" className="w-full md:w-auto">
            <Link href="/redacao">
              Continuar escrita
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
        <Surface className="min-h-[300px]">
          <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Seu desempenho</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-normal">Tendencia semanal</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                O foco e estabilizar a nota por competencia e transformar erros recorrentes em pratica objetiva.
              </p>
            </div>
            <Badge variant="outline" className="w-fit">
              {weeklyEvolution >= 0 ? "+" : ""}
              {weeklyEvolution} pontos
            </Badge>
          </div>
          <ScoreAreaChart data={data.trend} />
        </Surface>

        <Surface className="min-h-[300px]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Consistencia</p>
          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-5xl font-semibold tracking-normal">{data.streak_days}</p>
              <p className="mt-1 text-sm text-muted-foreground">dias de sequencia</p>
            </div>
            <CalendarDays className="h-8 w-8 text-secondary" aria-hidden="true" />
          </div>
          <Progress value={consistency} className="mt-5" />
          <div className="mt-5 grid grid-cols-2 gap-3">
            <MiniMetric label="Media" value={String(data.essay_average)} />
            <MiniMetric label="Textos" value={String(data.essays_written)} />
          </div>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            XP: {data.xp} pontos secundarios. A progressao principal e medida por escrita e desempenho.
          </p>
        </Surface>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Surface>
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Continue evoluindo</p>
            <h2 className="mt-1 text-xl font-semibold tracking-normal">Proximo passo recomendado</h2>
          </div>
          <div className="space-y-3">
            <ActionRow
              icon={PenLine}
              title="Continuar redacao em andamento"
              detail="Retome o texto e finalize um paragrafo antes da proxima correcao."
              href="/redacao"
            />
            <ActionRow
              icon={FileText}
              title="Revisar historico de correcoes"
              detail={`${data.essays_written} textos registrados para comparar evolucao.`}
              href="/redacoes"
            />
            <ActionRow
              icon={Target}
              title={nextExercise?.skill ?? "Praticar conectivos"}
              detail="Exercicio curto baseado nos pontos que mais derrubam coesao."
              href="/games"
            />
          </div>
        </Surface>

        <Surface>
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Competencias ENEM</p>
              <h2 className="mt-1 text-xl font-semibold tracking-normal">Mapa de dominio</h2>
            </div>
            <Badge variant="secondary">Foco: C4</Badge>
          </div>
          <CompetencyBarChart data={competencySnapshot} />
        </Surface>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)]">
        <Surface>
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Pratica inteligente</p>
            <h2 className="mt-1 text-xl font-semibold tracking-normal">Sugestoes contextualizadas</h2>
          </div>
          <div className="fluid-grid gap-3 [--grid-min:13rem]">
            <Recommendation
              title="Coesao textual"
              description="Treine retomadas e conectivos para reduzir repeticao no desenvolvimento."
              href="/games"
            />
            <Recommendation
              title="Repertorio produtivo"
              description="Reescreva uma referencia conectando causa, tese e consequencia."
              href="/redacao"
            />
            <Recommendation
              title={nextLesson?.title ?? "Aula recomendada"}
              description={
                nextLesson
                  ? `Continue ${nextLesson.module} em ${nextLesson.progress_percent}% de progresso.`
                  : "Assista uma aula curta antes da proxima escrita."
              }
              href={nextLesson ? `/aulas/${nextLesson.id}` : "/aulas"}
            />
          </div>
        </Surface>

        <Surface>
          <div className="mb-4 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-secondary" aria-hidden="true" />
            <h2 className="text-xl font-semibold tracking-normal">Erros recorrentes</h2>
          </div>
          <div className="space-y-2">
            {recurrentErrors.map((error) => (
              <div key={error} className="game-tile bg-background/58 p-3 text-sm leading-6 text-muted-foreground">
                {error}
              </div>
            ))}
          </div>
        </Surface>
      </section>

      <Surface>
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Atividade recente</p>
            <h2 className="mt-1 text-xl font-semibold tracking-normal">Linha de estudo</h2>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/redacoes">Abrir workspace</Link>
          </Button>
        </div>
        <div className="fluid-grid gap-3 [--grid-min:13rem]">
          {(data.recent_lessons.length
            ? data.recent_lessons.slice(0, 3)
            : [{ id: 1, title: "Estrutura dissertativa", module: "Redacao", progress_percent: 64 }]
          ).map((lesson) => (
            <div key={lesson.id} className="game-tile bg-background/58 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Aula</p>
              <p className="mt-2 font-semibold">{lesson.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{lesson.module}</p>
              <Progress value={lesson.progress_percent} className="mt-3 h-2" />
            </div>
          ))}
        </div>
      </Surface>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function ActionRow({ icon: Icon, title, detail, href }: { icon: LucideIcon; title: string; detail: string; href: string }) {
  return (
    <Link href={href} className="game-tile flex items-start gap-3 bg-background/58 p-3 hover:bg-primary/8">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/12 text-secondary">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">{detail}</p>
      </div>
    </Link>
  );
}

function Recommendation({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <Link href={href} className="game-tile flex min-h-[150px] flex-col justify-between bg-background/58 p-4 hover:bg-primary/8">
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-secondary">
        Comecar
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </span>
    </Link>
  );
}
