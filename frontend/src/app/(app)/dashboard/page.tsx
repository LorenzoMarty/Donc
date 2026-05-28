"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, BookOpen, CheckCircle2, FileText, Flame, PenLine, Send, Target, Trophy } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { LoadingCard } from "@/components/shared/loading-card";
import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { apiFetch, type Dashboard } from "@/services/api";

type LessonItem = Dashboard["suggested_lessons"][number];

type RecentActivity = {
  label: string;
  title: string;
  detail: string;
  href: string;
  icon: LucideIcon;
};

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    apiFetch<Dashboard>("/dashboard")
      .then((payload) => {
        if (!ignore) {
          setData(payload);
          setError("");
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Nao foi possivel carregar o painel.");
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const nextStep = useMemo(() => (data ? buildNextStep(data) : null), [data]);
  const recentActivities = useMemo(() => (data ? buildRecentActivities(data) : []), [data]);

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader
          eyebrow="Painel"
          title="Nao foi possivel carregar seus dados"
          description="O backend respondeu, mas os dados do painel ainda nao estao disponiveis."
          action={
            <Button size="lg" className="w-full md:w-auto" onClick={() => window.location.reload()}>
              Tentar novamente
            </Button>
          }
        />
        <EmptyState title="Dados indisponiveis" description={error} />
      </div>
    );
  }

  if (!data || !nextStep) {
    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <LoadingCard />
        <LoadingCard />
        <LoadingCard />
        <LoadingCard />
      </div>
    );
  }

  const masteryMap = data.mastery_map?.length ? data.mastery_map : fallbackMasteryMap();
  const recurrentErrors = data.recurrent_errors?.length ? data.recurrent_errors : ["Envie novas redacoes para mapear erros recorrentes."];
  const suggestedLessons = data.suggested_lessons?.length ? data.suggested_lessons : fallbackLessons();
  const bestEssayScore = data.best_essay_score ?? data.essay_average ?? 0;
  const progressGeneral = data.progress_general ?? 0;
  const completedLessons = data.completed_lessons ?? 0;
  const essaysWritten = data.essays_written ?? 0;
  const essayAverage = data.essay_average ?? 0;
  const stats = [
    { label: "Dias em sequencia", value: String(data.streak_days ?? 0), detail: "ritmo atual", icon: Flame },
    { label: "Melhor nota", value: bestEssayScore ? String(bestEssayScore) : "-", detail: "maior redacao corrigida", icon: Trophy },
    { label: "Aulas assistidas", value: String(completedLessons), detail: `${progressGeneral}% do percurso`, icon: BookOpen },
    { label: "Redacoes enviadas", value: String(essaysWritten), detail: `${essayAverage} de media`, icon: Send },
  ];
  const NextStepIcon = nextStep.icon;

  return (
    <div className="space-y-3">
      <PageHeader
        eyebrow="Painel"
        title="Resumo de evolucao"
        description="Dominio, rotina e proximas acoes em uma visao compacta."
        action={
          <Button asChild size="lg" className="w-full md:w-auto">
            <Link href="/redacao">
              Nova redacao
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <MetricCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(20rem,0.88fr)]">
        <Surface>
          <SectionTitle eyebrow="Competencias ENEM" title="Mapa de dominio" />
          <div className="mt-4 grid gap-3">
            {masteryMap.map((item) => (
              <DomainRow key={item.competency} competency={item.competency} label={item.label} value={item.value} />
            ))}
          </div>
        </Surface>

        <Surface>
          <div className="flex items-start justify-between gap-3">
            <SectionTitle eyebrow="Prioridade" title="Proximo passo recomendado" />
            <Badge variant="secondary" className="shrink-0">
              {nextStep.badge}
            </Badge>
          </div>
          <div className="mt-5 rounded-md border border-primary/20 bg-primary/8 p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-primary/25 bg-primary/12 text-primary">
                <NextStepIcon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-semibold tracking-normal">{nextStep.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{nextStep.detail}</p>
              </div>
            </div>
            <Button asChild className="mt-4 w-full">
              <Link href={nextStep.href}>
                Abrir tarefa
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </Surface>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Surface>
          <SectionTitle eyebrow="Aulas" title="Sugestao de aulas" />
          <div className="mt-4 grid gap-2">
            {suggestedLessons.slice(0, 3).map((lesson) => (
              <LessonRow key={lesson.id} lesson={lesson} />
            ))}
          </div>
        </Surface>

        <Surface>
          <SectionTitle eyebrow="Registro" title="Atividades recentes" />
          <div className="mt-4 grid gap-2">
            {recentActivities.length ? (
              recentActivities.slice(0, 4).map((activity) => <ActivityRow key={`${activity.label}-${activity.title}`} activity={activity} />)
            ) : (
              <EmptyLine text="Nenhuma atividade recente registrada." />
            )}
          </div>
        </Surface>
      </section>

      <Surface>
        <SectionTitle eyebrow="Diagnostico" title="Erros recorrentes" />
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {recurrentErrors.slice(0, 4).map((item) => (
            <div key={item} className="rounded-md border border-border bg-background/58 p-3 text-sm leading-6 text-muted-foreground">
              {item}
            </div>
          ))}
        </div>
      </Surface>
    </div>
  );
}

function MetricCard({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: LucideIcon }) {
  return (
    <Surface>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-normal">{value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
        </div>
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-primary/25 bg-primary/12 text-secondary">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>
    </Surface>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-semibold tracking-normal">{title}</h2>
    </div>
  );
}

function DomainRow({ competency, label, value }: { competency: string; label: string; value: number }) {
  const percent = Math.max(0, Math.min(100, (value / 200) * 100));
  return (
    <div className="grid gap-2 rounded-md border border-border bg-background/58 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{competency}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
        <span className="text-sm font-semibold">{value || "-"}</span>
      </div>
      <Progress value={percent} className="h-2" />
    </div>
  );
}

function LessonRow({ lesson }: { lesson: LessonItem }) {
  return (
    <Link href={`/aulas/${lesson.id}`} className="rounded-md border border-border bg-background/58 p-3 transition-colors hover:bg-primary/8">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-safe text-sm font-semibold">{lesson.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{lesson.module}</p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-secondary">{lesson.progress_percent}%</span>
      </div>
      <Progress value={lesson.progress_percent} className="mt-3 h-1.5" />
    </Link>
  );
}

function ActivityRow({ activity }: { activity: RecentActivity }) {
  const Icon = activity.icon;
  return (
    <Link href={activity.href} className="flex items-start gap-3 rounded-md border border-border bg-background/58 p-3 transition-colors hover:bg-primary/8">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-primary/20 bg-primary/10 text-secondary">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{activity.label}</p>
        <p className="text-safe mt-1 text-sm font-semibold">{activity.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{activity.detail}</p>
      </div>
    </Link>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed border-border bg-background/35 p-3 text-sm text-muted-foreground">{text}</div>;
}

function buildNextStep(data: Dashboard) {
  const masteryMap = data.mastery_map?.length ? data.mastery_map : fallbackMasteryMap();
  const recurrentErrors = data.recurrent_errors ?? [];
  const weak = masteryMap.filter((item) => item.value > 0).sort((a, b) => a.value - b.value)[0];
  if (!data.essays_written) {
    return {
      badge: "redacao",
      title: "Enviar a primeira redacao",
      detail: "Comece com um texto completo para liberar diagnostico por competencia e erros recorrentes.",
      href: "/redacao",
      icon: PenLine,
    };
  }
  if (weak) {
    return {
      badge: weak.competency,
      title: `Fortalecer ${weak.label.toLowerCase()}`,
      detail: recurrentErrors[0] ?? "Reescreva um trecho curto e compare a evolucao na proxima correcao.",
      href: weak.competency === "C1" || weak.competency === "C4" ? "/games" : "/redacao",
      icon: Target,
    };
  }
  return {
    badge: "revisao",
    title: "Revisar historico de correcoes",
    detail: "Compare suas ultimas notas e escolha uma competencia para treinar hoje.",
    href: "/redacoes",
    icon: FileText,
  };
}

function buildRecentActivities(data: Dashboard): RecentActivity[] {
  const recentLessons = data.recent_lessons ?? [];
  const recentExams = data.recent_exams ?? [];
  const trend = data.trend ?? [];
  const lessons = recentLessons.map((lesson) => ({
    label: "Aula",
    title: lesson.title,
    detail: `${lesson.module} - ${lesson.progress_percent}% concluido`,
    href: `/aulas/${lesson.id}`,
    icon: BookOpen,
  }));
  const exams = recentExams.map((exam) => ({
    label: "Simulado",
    title: exam.title,
    detail: `${exam.score} pontos`,
    href: "/simulados",
    icon: CheckCircle2,
  }));
  const lastScore = trend.at(-1)?.score;
  const essay = lastScore
    ? [
        {
          label: "Redacao",
          title: "Ultima correcao registrada",
          detail: `${lastScore} pontos`,
          href: "/redacoes",
          icon: FileText,
        },
      ]
    : [];
  return [...essay, ...lessons, ...exams];
}

function fallbackLessons(): LessonItem[] {
  return [
    { id: 1, title: "Como decodificar o tema", module: "Fundamentos da Redacao", progress_percent: 0 },
    { id: 2, title: "Tese forte em 3 movimentos", module: "Fundamentos da Redacao", progress_percent: 0 },
    { id: 3, title: "Competencia 5 sem formula vazia", module: "Competencias do ENEM", progress_percent: 0 },
  ];
}

function fallbackMasteryMap(): Dashboard["mastery_map"] {
  return [
    { competency: "C1", label: "Norma-padrao", value: 0 },
    { competency: "C2", label: "Tema e genero", value: 0 },
    { competency: "C3", label: "Argumentacao", value: 0 },
    { competency: "C4", label: "Coesao", value: 0 },
    { competency: "C5", label: "Intervencao", value: 0 },
  ];
}
