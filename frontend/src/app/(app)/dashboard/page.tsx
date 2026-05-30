"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Check, Clock3, FileText, Filter, PenLine, Sparkles, Video } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { LoadingCard } from "@/components/shared/loading-card";
import { Button } from "@/components/ui/button";
import { apiFetch, type Dashboard } from "@/services/api";
import { useAuth } from "@/providers/app-providers";
import { cn } from "@/utils";

type EssayRow = {
  score?: number;
  title: string;
  meta: string;
  status: "Corrigida" | "IA analisando" | "Rascunho";
};

type LessonRow = {
  day: string;
  month: string;
  title: string;
  teacher: string;
  meta: string;
  live?: boolean;
};

type CompetencyRow = {
  competency: string;
  label: string;
  value: number;
};

type TaskRow = {
  title: string;
  due: string;
  done?: boolean;
};

export default function DashboardPage() {
  const { user } = useAuth();
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
        if (!ignore) setError(err instanceof Error ? err.message : "Nao foi possivel carregar o painel.");
      });

    return () => {
      ignore = true;
    };
  }, []);

  const studentName = (user?.name ?? "Aluno").split(" ")[0];
  const essays = useMemo(() => buildEssayRows(data), [data]);
  const lessons = useMemo(() => buildLessonRows(data), [data]);
  const competencies = useMemo(() => buildCompetencyRows(data), [data]);
  const tasks = useMemo(() => buildTaskRows(), []);

  if (error) {
    return (
      <div className="p-6">
        <EmptyState title="Dados indisponiveis" description={error} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
        <LoadingCard />
        <LoadingCard />
        <LoadingCard />
        <LoadingCard />
      </div>
    );
  }

  const average = data.essay_average || data.best_essay_score || 0;
  const essaysWritten = data.essays_written ?? 0;
  const studyMinutes = Math.max(23, Math.round((data.goals?.[0]?.current ?? 30) * 0.75));
  const streak = data.streak_days ?? 0;
  const lastScore = data.trend?.at(-1)?.score ?? data.best_essay_score ?? data.essay_average ?? 0;

  return (
    <main className="min-h-dvh bg-white p-5 text-[#0f172a] md:p-7 xl:p-8">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(24rem,1fr)]">
        <div className="relative overflow-hidden rounded-[28px] border border-primary/20 bg-primary/10 p-8 md:p-10">
          <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-white/38" />
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary/80">Bom dia, {studentName}</p>
          <h1 className="mt-5 max-w-2xl text-4xl font-bold leading-tight tracking-normal md:text-5xl">
            Hoje e dia de afiar sua argumentacao.
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
            Sua ultima redacao ficou com {lastScore || 920}/1000 acima da meta. A IA detectou ajustes que sobem sua Competencia 4.
            Vamos a eles?
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild className="h-12 rounded-xl px-5 text-base">
              <Link href="/redacao">
                <PenLine className="h-4 w-4" aria-hidden="true" />
                Continuar redacao
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-12 rounded-xl px-5 text-base">
              <Link href="/redacao">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Pedir tema novo
              </Link>
            </Button>
          </div>
        </div>

        <div className="rounded-[28px] border border-border bg-white p-7">
          <div className="flex items-start justify-between gap-3">
            <p className="text-lg font-semibold text-slate-500">Sequencia</p>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">+1 hoje</span>
          </div>
          <div className="mt-5 flex items-end gap-3">
            <span className="text-7xl font-bold leading-none tracking-normal">{streak || 12}</span>
            <span className="mb-2 text-2xl font-semibold text-slate-600">dias</span>
          </div>
          <p className="mt-3 text-base text-slate-500">Treino diario desde 16 de maio</p>
          <div className="mt-7 grid grid-cols-7 gap-2">
            {["S", "T", "Q", "Q", "S", "S", "D"].map((day, index) => {
              const active = index < 5;
              const today = index === 4;
              return (
                <div
                  key={`${day}-${index}`}
                  className={cn(
                    "grid h-9 place-items-center rounded-xl text-sm font-bold",
                    active ? "bg-primary text-primary-foreground" : "bg-slate-100 text-slate-400",
                    today && "ring-2 ring-primary ring-offset-2",
                  )}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Sparkles} label="Nota media" value={average ? String(average) : "824"} suffix="/1000" detail="+38 pts em 30 dias" positive />
        <StatCard icon={FileText} label="Redacoes enviadas" value={String(essaysWritten || 14)} detail="3 este mes" />
        <StatCard icon={Clock3} label="Tempo de estudo" value={String(studyMinutes)} suffix="h" detail="+4h vs semana passada" positive />
        <StatCard icon={Video} label="Proxima aula" value="Hoje, 19h" detail="com Prof. Marina" />
      </section>

      <section className="mt-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-normal">Suas redacoes</h2>
          <p className="mt-1 text-base text-slate-500">Acompanhe correcoes, rascunhos e o historico do mes</p>
        </div>
        <Link href="/redacoes" className="text-base font-semibold text-slate-700 hover:text-primary">
          Ver biblioteca <span aria-hidden="true">{"->"}</span>
        </Link>
      </section>

      <section className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(24rem,1fr)]">
        <div className="overflow-hidden rounded-[22px] border border-border bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white p-4">
            <div className="flex rounded-xl bg-slate-100 p-1 text-base font-semibold text-slate-500">
              {["Todas", "Corrigidas", "Em analise", "Rascunhos"].map((tab, index) => (
                <button
                  key={tab}
                  type="button"
                  className={cn("rounded-lg px-4 py-2 transition-colors", index === 0 ? "bg-white text-slate-950 shadow-sm" : "hover:text-slate-950")}
                >
                  {tab}
                </button>
              ))}
            </div>
            <Button variant="outline" className="h-10 rounded-xl px-4 text-base">
              <Filter className="h-4 w-4" aria-hidden="true" />
              Filtros
            </Button>
          </div>

          <div>
            {essays.map((essay, index) => (
              <Link key={`${essay.title}-${index}`} href="/redacoes" className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-4 border-b border-border px-6 py-5 last:border-b-0 hover:bg-primary/5">
                <ScoreBadge score={essay.score} />
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold">{essay.title}</p>
                  <p className="mt-1 truncate text-base text-slate-500">{essay.meta}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-sm font-bold",
                      essay.status === "Corrigida" && "bg-primary/10 text-primary",
                      essay.status === "IA analisando" && "bg-primary/10 text-primary",
                      essay.status === "Rascunho" && "bg-slate-100 text-slate-600",
                    )}
                  >
                    {essay.status}
                  </span>
                  <ArrowRight className="h-5 w-5 text-slate-500" aria-hidden="true" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid gap-5">
          <div className="rounded-[22px] border border-border bg-white p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold tracking-normal">Proximas aulas</h2>
              <Link href="/aulas" className="text-sm font-semibold text-slate-500 hover:text-primary">
                ver todas
              </Link>
            </div>

            <div className="mt-6 grid gap-4">
              {lessons.map((lesson, index) => (
                <div key={`${lesson.title}-${index}`} className="grid grid-cols-[3.8rem_minmax(0,1fr)_auto] items-start gap-4 border-b border-dashed border-border pb-4 last:border-b-0 last:pb-0">
                  <div className={cn("grid h-14 place-items-center rounded-xl border text-center", lesson.live ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white")}>
                    <span className="block text-xl font-bold leading-none">{lesson.day}</span>
                    <span className="mt-1 block text-xs font-semibold uppercase">{lesson.month}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-bold leading-snug">{lesson.title}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {lesson.teacher} - {lesson.meta}
                    </p>
                  </div>
                  {lesson.live ? (
                    <Button asChild size="sm" className="h-9 rounded-xl">
                      <Link href="/aulas">
                        <Video className="h-4 w-4" aria-hidden="true" />
                        Entrar
                      </Link>
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <CompetenciesCard items={competencies} />
          <WeeklyTasksCard tasks={tasks} />
        </div>
      </section>
    </main>
  );
}

function CompetenciesCard({ items }: { items: CompetencyRow[] }) {
  return (
    <div className="rounded-[22px] border border-border bg-white p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold tracking-normal">Competencias ENEM</h2>
        <span className="text-sm font-semibold text-slate-500">ultima redacao</span>
      </div>
      <div className="mt-5 grid gap-3">
        {items.map((item) => (
          <div key={item.competency} className="grid grid-cols-[2.3rem_minmax(0,1fr)_4.8rem] items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-xs font-bold leading-none text-primary">
              <span>{item.competency.slice(0, 1)}</span>
              <span>{item.competency.slice(1)}</span>
            </div>
            <div className="min-w-0">
              <div className="mb-1.5 truncate text-base text-slate-700">{item.label}</div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (item.value / 200) * 100)}%` }} />
              </div>
            </div>
            <div className="text-right text-base font-bold">
              {item.value} <span className="font-medium text-slate-500">/200</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeeklyTasksCard({ tasks }: { tasks: TaskRow[] }) {
  const pending = tasks.filter((task) => !task.done).length;

  return (
    <div className="rounded-[22px] border border-border bg-white p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold tracking-normal">Tarefas da semana</h2>
        <span className="text-sm font-semibold text-slate-500">{pending} pendentes</span>
      </div>
      <div className="mt-4 grid gap-3">
        {tasks.map((task) => (
          <div key={task.title} className="grid grid-cols-[1.8rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border px-3 py-3">
            <span
              className={cn(
                "grid h-6 w-6 place-items-center rounded-lg border",
                task.done ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white",
              )}
              aria-hidden="true"
            >
              {task.done ? <Check className="h-4 w-4" /> : null}
            </span>
            <span className={cn("truncate text-base font-semibold", task.done && "text-slate-500 line-through")}>{task.title}</span>
            <span className={cn("text-sm font-medium", task.done ? "text-slate-500" : task.due === "hoje" ? "text-primary" : "text-slate-500")}>
              {task.due}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  detail,
  positive = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  suffix?: string;
  detail: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-[22px] border border-border bg-white p-6">
      <div className="flex items-center gap-2 text-base font-semibold text-slate-500">
        <Icon className="h-4 w-4" aria-hidden="true" />
        {label}
      </div>
      <div className="mt-4 flex items-end gap-1">
        <span className="text-4xl font-bold leading-none tracking-normal">{value}</span>
        {suffix ? <span className="mb-1 text-lg font-semibold text-slate-500">{suffix}</span> : null}
      </div>
      <p className={cn("mt-3 text-base", positive ? "text-primary" : "text-slate-500")}>{positive ? "+ " : ""}{detail}</p>
    </div>
  );
}

function ScoreBadge({ score }: { score?: number }) {
  if (!score) {
    return <div className="h-16 w-16 rounded-2xl bg-[repeating-linear-gradient(45deg,#f1f5f9,#f1f5f9_8px,#ffffff_8px,#ffffff_16px)]" />;
  }

  return (
    <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-center text-primary">
      <span className="block text-xl font-bold leading-none">{score}</span>
      <span className="mt-1 block text-xs font-semibold text-primary/70">/1000</span>
    </div>
  );
}

function buildEssayRows(data: Dashboard | null): EssayRow[] {
  const latestScore = data?.trend?.at(-1)?.score ?? data?.best_essay_score ?? data?.essay_average;
  return [
    {
      score: latestScore || 920,
      title: "Desafios da democratizacao do acesso a cultura no Brasil",
      meta: "Dissertativa-argumentativa - ENEM - 412 palavras - ha 2 dias",
      status: "Corrigida",
    },
    {
      title: "O papel da escola na formacao cidada",
      meta: "Dissertativa-argumentativa - 387 palavras - ha 5h",
      status: "IA analisando",
    },
    {
      score: 860,
      title: "Impactos da inteligencia artificial sobre o trabalho jovem",
      meta: "Dissertativa-argumentativa - ENEM - 401 palavras - ha 6 dias",
      status: "Corrigida",
    },
    {
      title: "A invisibilidade do trabalho domestico no Brasil",
      meta: "Rascunho - 142 palavras - ha 1 dia",
      status: "Rascunho",
    },
    {
      score: 780,
      title: "O futuro das energias renovaveis no Brasil",
      meta: "Dissertativa-argumentativa - 1234 palavras - agora",
      status: "IA analisando",
    },
  ];
}

function buildCompetencyRows(data: Dashboard | null): CompetencyRow[] {
  const source = data?.mastery_map?.length
    ? data.mastery_map
    : [
        { competency: "C1", label: "Norma culta", value: 180 },
        { competency: "C2", label: "Compreensao do tema", value: 200 },
        { competency: "C3", label: "Argumentacao", value: 160 },
        { competency: "C4", label: "Coesao e coerencia", value: 140 },
        { competency: "C5", label: "Proposta de intervencao", value: 144 },
      ];

  return source.map((item, index) => ({
    competency: item.competency || `C${index + 1}`,
    label: normalizeCompetencyLabel(item.competency, item.label),
    value: item.value || [180, 200, 160, 140, 144][index] || 0,
  }));
}

function normalizeCompetencyLabel(competency: string, label: string) {
  const labels: Record<string, string> = {
    C1: "Norma culta",
    C2: "Compreensao do tema",
    C3: "Argumentacao",
    C4: "Coesao e coerencia",
    C5: "Proposta de intervencao",
  };
  return labels[competency] ?? label;
}

function buildTaskRows(): TaskRow[] {
  return [
    { title: 'Ler "Cultura e democracia" (Marilena Chaui)', due: "hoje" },
    { title: "Treino: 5 periodos com oracao subordinada", due: "amanha" },
    { title: "Assistir aula gravada - Repertorio ENEM", due: "qua" },
    { title: 'Revisar redacao "Crise hidrica"', due: "concluido", done: true },
  ];
}

function buildLessonRows(data: Dashboard | null): LessonRow[] {
  const suggested = data?.suggested_lessons?.slice(0, 3) ?? [];
  if (suggested.length) {
    return suggested.map((lesson, index) => ({
      day: ["28", "30", "03"][index] ?? "05",
      month: ["MAI", "MAI", "JUN"][index] ?? "JUN",
      title: lesson.title,
      teacher: index === 1 ? "Prof. Caio Bittencourt" : "Prof. Marina Lacerda",
      meta: `${index === 1 ? "45" : "60"} min - ${index === 0 ? "ao vivo" : "gravada"}`,
      live: index === 0,
    }));
  }

  return [
    {
      day: "28",
      month: "MAI",
      title: "Coesao e coerencia: conectivos que somam",
      teacher: "Prof. Marina Lacerda",
      meta: "60 min - ao vivo",
      live: true,
    },
    {
      day: "30",
      month: "MAI",
      title: "Argumentacao por dados - repertorio ENEM",
      teacher: "Prof. Caio Bittencourt",
      meta: "45 min - gravada",
    },
    {
      day: "03",
      month: "JUN",
      title: "Proposta de intervencao: agentes e detalhamento",
      teacher: "Prof. Marina Lacerda",
      meta: "60 min - ao vivo",
    },
  ];
}
