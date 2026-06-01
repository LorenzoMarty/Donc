"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, BookOpen, Check, Clock3, FileText, PenLine, Sparkles, Video } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { LoadingCard } from "@/components/shared/loading-card";
import { Button } from "@/components/ui/button";
import { apiFetch, type Dashboard, type Essay } from "@/services/api";
import { useAuth } from "@/providers/app-providers";
import { cn } from "@/utils";

type EssayRow = {
  id: number;
  score: number | null;
  title: string;
  meta: string;
  status: Essay["status"];
  updatedAt: string;
  href: string;
};

type LessonRow = {
  id: number;
  index: number;
  title: string;
  module: string;
  progressPercent: number;
  href: string;
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
  href: string;
};

const statusLabel: Record<Essay["status"], string> = {
  draft: "Rascunho",
  submitted: "IA analisando",
  corrected: "Corrigida",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadDashboard() {
      try {
        const dashboardPayload = await apiFetch<Dashboard>("/dashboard");
        if (ignore) return;
        setData(dashboardPayload);
        setError("");
      } catch (err) {
        if (!ignore) setError(err instanceof Error ? err.message : "Nao foi possivel carregar o painel.");
      }
    }

    loadDashboard();
    return () => {
      ignore = true;
    };
  }, []);

  const essays = useMemo(() => buildEssayRows(data), [data]);
  const lessons = useMemo(() => buildLessonRows(data), [data]);
  const competencies = useMemo(() => buildCompetencyRows(data), [data]);
  const tasks = useMemo(() => buildTaskRows(data), [data]);
  const latestDraft = essays.find((essay) => essay.status === "draft");
  const latestEssay = essays[0];

  if (error) {
    return (
      <div>
        <EmptyState title="Dados indisponiveis" description={error} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <LoadingCard />
        <LoadingCard />
        <LoadingCard />
        <LoadingCard />
      </div>
    );
  }

  const studentName = (user?.name ?? "Aluno").split(" ")[0];
  const average = data.essay_average || 0;
  const essaysWritten = data.essays_written ?? essays.length;
  const completedLessons = data.completed_lessons ?? 0;
  const streak = data.streak_days ?? 0;
  const bestScore = data.best_essay_score || latestEssay?.score || 0;
  const studyGoal = data.goals.find((goal) => goal.unit.toLowerCase().includes("min")) ?? data.goals[0];
  const studyValue = studyGoal ? String(studyGoal.current) : String(Math.round((data.progress_general ?? 0) / 2));
  const studySuffix = studyGoal?.unit ? ` ${studyGoal.unit}` : " min";
  const heroHref = latestDraft?.href ?? "/redacao";
  const heroCopy = buildHeroCopy({ bestScore, latestDraft: Boolean(latestDraft), progress: data.progress_general });

  return (
    <div className="text-[#0f172a]">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(24rem,1fr)]">
        <div className="relative overflow-hidden rounded-[28px] border border-primary/20 bg-primary/10 p-8 md:p-10">
          <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-white/38" />
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary/80">Bom dia, {studentName}</p>
          <h1 className="mt-5 max-w-2xl text-4xl font-bold leading-tight tracking-normal md:text-5xl">{heroCopy.title}</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">{heroCopy.description}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild className="h-12 rounded-xl px-5 text-base">
              <Link href={heroHref}>
                <PenLine className="h-4 w-4" aria-hidden="true" />
                {latestDraft ? "Continuar redacao" : "Comecar redacao"}
              </Link>
            </Button>
          </div>
        </div>

        <div className="rounded-[28px] border border-border bg-white p-7">
          <div className="flex items-start justify-between gap-3">
            <p className="text-lg font-semibold text-slate-500">Sequencia</p>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
              {streak > 0 ? "+1 hoje" : "comece hoje"}
            </span>
          </div>
          <div className="mt-5 flex items-end gap-3">
            <span className="text-7xl font-bold leading-none tracking-normal">{streak}</span>
            <span className="mb-2 text-2xl font-semibold text-slate-600">dias</span>
          </div>
          <p className="mt-3 text-base text-slate-500">{streak > 0 ? "Treino diario ativo" : "Uma acao hoje inicia sua sequencia"}</p>
          <div className="mt-7 grid grid-cols-7 gap-2">
            {buildWeekProgress(streak).map((day) => (
              <div
                key={day.key}
                className={cn(
                  "grid h-9 place-items-center rounded-xl text-sm font-bold",
                  day.active ? "bg-primary text-primary-foreground" : "bg-slate-100 text-slate-400",
                  day.today && "ring-2 ring-primary ring-offset-2",
                )}
              >
                {day.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Sparkles}
          label="Nota media"
          value={average ? String(average) : "--"}
          suffix="/1000"
          detail={bestScore ? `melhor nota ${bestScore}` : "envie uma redacao"}
          href="/redacoes"
        />
        <StatCard
          icon={FileText}
          label="Redacoes enviadas"
          value={String(essaysWritten)}
          detail={`${essays.length} na biblioteca`}
          href="/redacoes"
        />
        <StatCard
          icon={Clock3}
          label="Tempo de estudo"
          value={studyValue}
          suffix={studySuffix}
          detail={studyGoal ? `${studyGoal.target} ${studyGoal.unit} de meta` : "acompanhe sua rotina"}
          href="/aulas"
        />
        <StatCard
          icon={Video}
          label="Aulas assistidas"
          value={String(completedLessons)}
          detail={`${data.progress_general ?? 0}% do percurso`}
          href="/aulas"
        />
      </section>

      <section className="mt-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-normal">Suas redacoes</h2>
          <p className="mt-1 text-base text-slate-500">Acompanhe correcoes, rascunhos e o historico do mes</p>
        </div>
      </section>

      <section className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(24rem,1fr)]">
        <div className="overflow-hidden rounded-[22px] border border-border bg-white">
          {essays.length ? (
            <div>
              {essays.map((essay) => (
                <Link
                  key={essay.id}
                  href={essay.href}
                  className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-4 border-b border-border px-6 py-5 last:border-b-0 hover:bg-primary/5 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto]"
                >
                  <ScoreBadge score={essay.score} />
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold">{essay.title}</p>
                    <p className="mt-1 truncate text-base text-slate-500">{essay.meta}</p>
                  </div>
                  <div className="col-span-2 flex items-center justify-between gap-4 sm:col-span-1 sm:justify-end">
                    <StatusPill status={essay.status} />
                    <ArrowRight className="h-5 w-5 text-slate-500" aria-hidden="true" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid min-h-64 place-items-center px-6 py-10 text-center">
              <div>
                <p className="text-lg font-bold">Nenhuma redacao ainda.</p>
                <p className="mt-2 text-base text-slate-500">Comece uma redacao para acompanhar seu historico no painel.</p>
                <Button asChild className="mt-5">
                  <Link href="/redacao">
                    <PenLine className="h-4 w-4" aria-hidden="true" />
                    Escrever redacao
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-5">
          <LessonsCard lessons={lessons} />
          <CompetenciesCard items={competencies} />
          <WeeklyTasksCard tasks={tasks} />
        </div>
      </section>
    </div>
  );
}

function LessonsCard({ lessons }: { lessons: LessonRow[] }) {
  return (
    <div className="rounded-[22px] border border-border bg-white p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold tracking-normal">Aulas recentes</h2>
        <Link href="/aulas" className="text-sm font-semibold text-slate-500 hover:text-primary">
          ver todas
        </Link>
      </div>

      {lessons.length ? (
        <div className="mt-6 grid gap-4">
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="grid grid-cols-[3.8rem_minmax(0,1fr)] items-start gap-4 border-b border-dashed border-border pb-4 last:border-b-0 last:pb-0 sm:grid-cols-[3.8rem_minmax(0,1fr)_auto]"
            >
              <div className="grid h-14 place-items-center rounded-xl border border-border bg-white text-center text-primary">
                <span className="block text-xl font-bold leading-none">{String(lesson.index).padStart(2, "0")}</span>
                <span className="mt-1 block text-xs font-semibold uppercase">AULA</span>
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold leading-snug">{lesson.title}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {lesson.module} - {lesson.progressPercent}% concluida
                </p>
              </div>
              <Button asChild size="sm" className="col-span-2 h-9 rounded-xl sm:col-span-1">
                <Link href={lesson.href}>
                  <Video className="h-4 w-4" aria-hidden="true" />
                  {lesson.progressPercent > 0 ? "Rever" : "Assistir"}
                </Link>
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-border p-4 text-sm text-slate-500">
          Nenhuma aula acessada ainda.
          <Button asChild size="sm" className="mt-4 w-full rounded-xl">
            <Link href="/aulas">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Abrir aulas
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

function CompetenciesCard({ items }: { items: CompetencyRow[] }) {
  return (
    <div className="rounded-[22px] border border-border bg-white p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold tracking-normal">Competencias ENEM</h2>
        <Link href="/redacoes" className="text-sm font-semibold text-slate-500 hover:text-primary">
          ultima redacao
        </Link>
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
          <Link
            key={task.title}
            href={task.href}
            className="grid grid-cols-[1.8rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border px-3 py-3 transition-colors hover:border-primary/25 hover:bg-primary/5"
          >
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
            <span
              className={cn("text-sm font-medium", task.done ? "text-slate-500" : task.due === "hoje" ? "text-primary" : "text-slate-500")}
            >
              {task.due}
            </span>
          </Link>
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
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  suffix?: string;
  detail: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[22px] border border-border bg-white p-6 transition-colors hover:border-primary/25 hover:bg-primary/5"
    >
      <div className="flex items-center gap-2 text-base font-semibold text-slate-500">
        <Icon className="h-4 w-4" aria-hidden="true" />
        {label}
      </div>
      <div className="mt-4 flex items-end gap-1">
        <span className="text-4xl font-bold leading-none tracking-normal">{value}</span>
        {suffix ? <span className="mb-1 text-lg font-semibold text-slate-500">{suffix}</span> : null}
      </div>
      <p className="mt-3 text-base text-slate-500">{detail}</p>
    </Link>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return <div className="h-16 w-16 rounded-2xl bg-[repeating-linear-gradient(45deg,#f1f5f9,#f1f5f9_8px,#ffffff_8px,#ffffff_16px)]" />;
  }

  return (
    <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-center text-primary">
      <span className="block text-xl font-bold leading-none">{score}</span>
      <span className="mt-1 block text-xs font-semibold text-primary/70">/1000</span>
    </div>
  );
}

function StatusPill({ status }: { status: Essay["status"] }) {
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-sm font-bold",
        status === "corrected" && "bg-primary/10 text-primary",
        status === "submitted" && "bg-primary/10 text-primary",
        status === "draft" && "bg-slate-100 text-slate-600",
      )}
    >
      {statusLabel[status]}
    </span>
  );
}

function buildEssayRows(data: Dashboard | null): EssayRow[] {
  return [...(data?.recent_essays ?? [])]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5)
    .map((essay) => ({
      id: essay.id,
      score: essay.score,
      title: essay.title,
      meta: `${essay.theme_title} - ${essay.word_count} palavras - ${formatRelativeDate(essay.updated_at)}`,
      status: essay.status,
      updatedAt: essay.updated_at,
      href: essay.status === "corrected" ? `/redacao?essayId=${essay.id}&view=analise` : `/redacao?essayId=${essay.id}`,
    }));
}

function buildCompetencyRows(data: Dashboard | null): CompetencyRow[] {
  const source = data?.mastery_map?.length
    ? data.mastery_map
    : [
        { competency: "C1", label: "Norma culta", value: 0 },
        { competency: "C2", label: "Compreensao do tema", value: 0 },
        { competency: "C3", label: "Argumentacao", value: 0 },
        { competency: "C4", label: "Coesao e coerencia", value: 0 },
        { competency: "C5", label: "Proposta de intervencao", value: 0 },
      ];

  return source.map((item, index) => ({
    competency: item.competency || `C${index + 1}`,
    label: normalizeCompetencyLabel(item.competency, item.label),
    value: item.value ?? 0,
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

function buildTaskRows(data: Dashboard | null): TaskRow[] {
  const goals =
    data?.goals.slice(0, 3).map((goal) => ({
      title: goal.title,
      due: goal.completed ? "concluido" : `${goal.current}/${goal.target} ${goal.unit}`,
      done: goal.completed,
      href: hrefForGoal(goal.title),
    })) ?? [];

  const exercises =
    data?.pending_exercises.slice(0, Math.max(0, 3 - goals.length)).map((exercise) => ({
      title: `Praticar ${exercise.skill}`,
      due: difficultyLabel(exercise.difficulty),
      href: "/games",
    })) ?? [];

  const review =
    data?.recurrent_errors?.[0] && goals.length + exercises.length < 4
      ? [
          {
            title: "Revisar erro recorrente",
            due: "redacoes",
            href: "/redacoes",
          },
        ]
      : [];

  const rows = [...goals, ...exercises, ...review].slice(0, 4);
  if (rows.length) return rows;

  return [
    { title: "Escrever primeira redacao", due: "hoje", href: "/redacao" },
    { title: "Assistir primeira aula", due: "aulas", href: "/aulas" },
    { title: "Treinar uma atividade", due: "pratica", href: "/games" },
  ];
}

function buildLessonRows(data: Dashboard | null): LessonRow[] {
  const source = data?.recent_lessons?.length ? data.recent_lessons : (data?.suggested_lessons ?? []);
  return source.slice(0, 3).map((lesson, index) => ({
    id: lesson.id,
    index: index + 1,
    title: lesson.title,
    module: lesson.module,
    progressPercent: lesson.progress_percent,
    href: `/aulas/${lesson.id}`,
  }));
}

function buildHeroCopy({ bestScore, latestDraft, progress }: { bestScore: number; latestDraft: boolean; progress: number }) {
  if (latestDraft) {
    return {
      title: "Continue sua redacao.",
      description: "Seu rascunho esta salvo. Retome o texto, conclua a tese e envie para correcao quando estiver pronto.",
    };
  }
  if (bestScore) {
    return {
      title: "Hoje e dia de afiar sua argumentacao.",
      description: `Sua melhor redacao chegou a ${bestScore}/1000. Use o painel para revisar competencias, aulas e proximos treinos.`,
    };
  }
  return {
    title: "Comece sua rotina de escrita.",
    description: `Seu percurso esta em ${progress}%. Escreva a primeira redacao para liberar analise por competencia e recomendacoes reais.`,
  };
}

function buildWeekProgress(streak: number) {
  const labels = ["S", "T", "Q", "Q", "S", "S", "D"];
  const todayIndex = (new Date().getDay() + 6) % 7;
  const firstActive = Math.max(0, todayIndex - Math.max(0, streak - 1));
  return labels.map((label, index) => ({
    key: `${label}-${index}`,
    label,
    today: index === todayIndex,
    active: streak > 0 && index >= firstActive && index <= todayIndex,
  }));
}

function hrefForGoal(title: string) {
  const normalized = title.toLowerCase();
  if (normalized.includes("aula")) return "/aulas";
  if (normalized.includes("redacao") || normalized.includes("redacoes")) return "/redacao";
  if (normalized.includes("exercicio") || normalized.includes("treino")) return "/games";
  return "/dashboard";
}

function difficultyLabel(value: string) {
  if (value === "hard") return "avancado";
  if (value === "medium") return "intermediario";
  return "essencial";
}

function formatRelativeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recentemente";

  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMinutes / 60);
  const diffDays = Math.round(diffHours / 24);
  const formatter = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, "minute");
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, "hour");
  return formatter.format(diffDays, "day");
}
