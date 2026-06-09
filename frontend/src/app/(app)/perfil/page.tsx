"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  Flame,
  GraduationCap,
  Medal,
  PenLine,
  Plus,
  Target,
  X,
  Zap,
} from "lucide-react";

import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { AppearanceSettings } from "@/app/(app)/perfil/components/appearance-settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { getRankSnapshot } from "@/features/xp/xp";
import { useAuth } from "@/providers/app-providers";
import { apiFetch, type Dashboard } from "@/services/api";
import { cn, initials } from "@/utils";

type ProfileTask = {
  id?: string;
  title: string;
  detail: string;
  href: string;
  done?: boolean;
  icon: LucideIcon;
  badge: string;
  note?: string;
  custom?: boolean;
};

type TaskDefinition = {
  focus: string;
  dailyMinutes: number;
  weeklyTarget: string;
  priority: string;
};

type CustomTask = {
  id: string;
  title: string;
  category: string;
  minutes: number;
  due: string;
  note: string;
  done: boolean;
};

const TASK_DEFINITION_KEY = "donc.profile.task-definition.v1";
const CUSTOM_TASKS_KEY = "donc.profile.custom-tasks.v1";

const defaultDefinition: TaskDefinition = {
  focus: "redacao",
  dailyMinutes: 45,
  weeklyTarget: "5x",
  priority: "nota",
};

const focusOptions = [
  { value: "redacao", label: "Redacao" },
  { value: "aulas", label: "Aulas" },
  { value: "exercicios", label: "Exercicios" },
  { value: "revisao", label: "Revisao" },
];

const weeklyTargetOptions = [
  { value: "3x", label: "3 dias/semana" },
  { value: "5x", label: "5 dias/semana" },
  { value: "7x", label: "Todos os dias" },
];

const priorityOptions = [
  { value: "nota", label: "Aumentar nota" },
  { value: "consistencia", label: "Criar rotina" },
  { value: "competencias", label: "Corrigir competencias" },
];

const taskCategoryOptions = [
  { value: "redacao", label: "Redacao" },
  { value: "aula", label: "Aula" },
  { value: "treino", label: "Treino" },
  { value: "revisao", label: "Revisao" },
];

export default function ProfilePage() {
  const { user } = useAuth();
  const xp = user?.xp ?? 0;
  const rank = getRankSnapshot(xp);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [definition, setDefinition] = useState<TaskDefinition>(() => getInitialDefinition());
  const [customTasks, setCustomTasks] = useState<CustomTask[]>(() => getInitialCustomTasks());
  const [taskDraft, setTaskDraft] = useState<CustomTask>(() => createTaskDraft());
  const [saved, setSaved] = useState(false);
  const [taskSaved, setTaskSaved] = useState(false);

  useEffect(() => {
    let ignore = false;

    apiFetch<Dashboard>("/dashboard")
      .then((payload) => {
        if (!ignore) setDashboard(payload);
      })
      .catch(() => {
        if (!ignore) setDashboard(null);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const tasks = useMemo(
    () => [...buildCustomProfileTasks(customTasks), ...buildProfileTasks(dashboard)].slice(0, 6),
    [customTasks, dashboard],
  );
  const completedTasks = tasks.filter((task) => task.done).length;
  const taskProgress = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const nextSuggestedLesson = dashboard?.suggested_lessons[0];

  function saveDefinition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = {
      ...definition,
      dailyMinutes: Math.max(10, Math.min(240, Number(definition.dailyMinutes) || defaultDefinition.dailyMinutes)),
    };
    setDefinition(normalized);
    localStorage.setItem(TASK_DEFINITION_KEY, JSON.stringify(normalized));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  function saveCustomTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = taskDraft.title.trim();
    if (!title) return;

    const nextTask: CustomTask = {
      ...taskDraft,
      id: crypto.randomUUID(),
      title,
      minutes: Math.max(5, Math.min(240, Number(taskDraft.minutes) || 30)),
      note: taskDraft.note.trim(),
    };
    const nextTasks = [nextTask, ...customTasks].slice(0, 8);
    setCustomTasks(nextTasks);
    localStorage.setItem(CUSTOM_TASKS_KEY, JSON.stringify(nextTasks));
    setTaskDraft(createTaskDraft());
    setTaskSaved(true);
    window.setTimeout(() => setTaskSaved(false), 1800);
  }

  function toggleCustomTask(id: string) {
    const nextTasks = customTasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task));
    setCustomTasks(nextTasks);
    localStorage.setItem(CUSTOM_TASKS_KEY, JSON.stringify(nextTasks));
  }

  function removeCustomTask(id: string) {
    const nextTasks = customTasks.filter((task) => task.id !== id);
    setCustomTasks(nextTasks);
    localStorage.setItem(CUSTOM_TASKS_KEY, JSON.stringify(nextTasks));
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        eyebrow="Perfil"
        title="Sua identidade de progresso"
        description="Consistencia, frequencia, tarefas e definicao da rotina de estudo."
        action={
          <Button asChild size="lg" className="w-full md:w-auto">
            <Link href="/redacoes">
              Ver historico
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <Surface className="bg-primary text-primary-foreground">
          <div className="flex flex-col gap-4 xs:flex-row xs:items-center xs:gap-5">
            <div className="grid h-20 w-20 place-items-center rounded-md border border-foreground/20 bg-foreground/10 text-2xl font-semibold text-foreground">
              {initials(user?.name ?? "Aluno")}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground/62">Aluno Donc ENEM</p>
              <h2 className="text-safe mt-1 text-3xl font-semibold tracking-normal">{user?.name ?? "Aluno"}</h2>
              <p className="text-safe mt-2 text-sm text-foreground/70">{user?.email}</p>
            </div>
          </div>
        </Surface>

        <div className="fluid-grid gap-4 [--grid-min:13rem]">
          <Metric icon={Zap} label="Pontos" value={String(xp)} />
          <Metric icon={GraduationCap} label="Rank" value={rank.current.name} />
          <Metric icon={Flame} label="Sequencia" value={`${user?.streak_days ?? 0} dias`} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
        <Surface>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Tarefas</p>
              <h2 className="mt-1 text-xl font-semibold tracking-normal">Plano ativo</h2>
            </div>
            <Badge variant="secondary">
              {completedTasks}/{tasks.length} concluidas
            </Badge>
          </div>
          <Progress value={taskProgress} className="mb-4 h-2" />
          <div className="grid gap-3">
            {tasks.map((task) => {
              const taskId = task.id;
              return (
                <TaskRow
                  key={taskId ?? `${task.title}:${task.href}`}
                  task={task}
                  onToggle={taskId ? () => toggleCustomTask(taskId) : undefined}
                  onRemove={taskId ? () => removeCustomTask(taskId) : undefined}
                />
              );
            })}
          </div>
        </Surface>

        <Surface>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Definicao de tarefa</p>
              <h2 className="mt-1 text-xl font-semibold tracking-normal">Rotina preferida</h2>
            </div>
            <Target className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>

          <form onSubmit={saveDefinition} className="grid gap-3 border-b border-border pb-4">
            <Field label="Foco principal">
              <select
                value={definition.focus}
                onChange={(event) => setDefinition((current) => ({ ...current, focus: event.target.value }))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
              >
                {focusOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <Field label="Minutos por dia">
                <Input
                  type="number"
                  min={10}
                  max={240}
                  value={definition.dailyMinutes}
                  onChange={(event) => setDefinition((current) => ({ ...current, dailyMinutes: Number(event.target.value) }))}
                />
              </Field>
              <Field label="Ritmo semanal">
                <select
                  value={definition.weeklyTarget}
                  onChange={(event) => setDefinition((current) => ({ ...current, weeklyTarget: event.target.value }))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                >
                  {weeklyTargetOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Prioridade">
              <select
                value={definition.priority}
                onChange={(event) => setDefinition((current) => ({ ...current, priority: event.target.value }))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
              >
                {priorityOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>

            <div className="rounded-md border border-border bg-background/58 p-3 text-sm leading-6 text-muted-foreground">
              {definition.dailyMinutes} min por dia, {labelFor(weeklyTargetOptions, definition.weeklyTarget).toLowerCase()}, com foco em{" "}
              {labelFor(focusOptions, definition.focus).toLowerCase()}.
            </div>

            <Button type="submit" className="w-full">
              {saved ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <ClipboardList className="h-4 w-4" aria-hidden="true" />}
              {saved ? "Definicao salva" : "Salvar definicao"}
            </Button>
          </form>

          <form onSubmit={saveCustomTask} className="mt-4 grid gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Nova tarefa</p>
              <h3 className="mt-1 text-base font-semibold tracking-normal">Definir atividade</h3>
            </div>

            <Field label="Titulo">
              <Input
                value={taskDraft.title}
                onChange={(event) => setTaskDraft((current) => ({ ...current, title: event.target.value }))}
                placeholder="ex: revisar proposta de intervencao"
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <Field label="Tipo">
                <select
                  value={taskDraft.category}
                  onChange={(event) => setTaskDraft((current) => ({ ...current, category: event.target.value }))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                >
                  {taskCategoryOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Duracao">
                <Input
                  type="number"
                  min={5}
                  max={240}
                  value={taskDraft.minutes}
                  onChange={(event) => setTaskDraft((current) => ({ ...current, minutes: Number(event.target.value) }))}
                />
              </Field>
            </div>

            <Field label="Prazo">
              <Input
                type="date"
                value={taskDraft.due}
                onChange={(event) => setTaskDraft((current) => ({ ...current, due: event.target.value }))}
              />
            </Field>

            <Field label="Observacao">
              <Input
                value={taskDraft.note}
                onChange={(event) => setTaskDraft((current) => ({ ...current, note: event.target.value }))}
                placeholder="criterio, material ou foco da tarefa"
              />
            </Field>

            <Button type="submit" variant="outline" className="w-full" disabled={!taskDraft.title.trim()}>
              {taskSaved ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
              {taskSaved ? "Tarefa criada" : "Adicionar tarefa"}
            </Button>
          </form>
        </Surface>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
        <Surface>
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Proximo rank</p>
              <h2 className="mt-1 text-xl font-semibold tracking-normal">Energia intelectual acumulada</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {rank.next ? `${rank.xpToNext} XP ate ${rank.next.name}` : "Rank maximo alcancado"}
              </p>
            </div>
            <Medal className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <Progress value={rank.progress} className="h-3" />
        </Surface>

        <Surface>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Proxima acao</p>
          <h2 className="mt-1 text-xl font-semibold tracking-normal">{nextSuggestedLesson?.title ?? "Escrever uma redacao"}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {nextSuggestedLesson?.module ?? "Use uma tarefa curta para manter a rotina ativa."}
          </p>
          <Button asChild variant="outline" className="mt-4 w-full justify-between">
            <Link href={nextSuggestedLesson ? `/aulas/${nextSuggestedLesson.id}` : "/redacao"}>
              Abrir
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </Surface>
      </section>

      <AppearanceSettings />
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <Surface>
      <div className="mb-4 grid h-10 w-10 place-items-center rounded-md border border-primary/25 bg-primary/12 text-primary">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-normal">{value}</p>
    </Surface>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function TaskRow({ task, onToggle, onRemove }: { task: ProfileTask; onToggle?: () => void; onRemove?: () => void }) {
  const Icon = task.icon;
  const content = (
    <>
      <span
        className={cn(
          "grid h-10 w-10 place-items-center rounded-md border",
          task.done ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-primary",
        )}
      >
        {task.done ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : <Icon className="h-5 w-5" aria-hidden="true" />}
      </span>
      <span className="min-w-0">
        <span className={cn("block truncate text-sm font-semibold", task.done && "text-muted-foreground line-through")}>{task.title}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{task.detail}</span>
        {task.note ? <span className="mt-1 block truncate text-xs text-muted-foreground/80">{task.note}</span> : null}
      </span>
    </>
  );

  if (task.custom) {
    return (
      <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-border bg-background/58 p-3">
        {content}
        <span className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggle}
            className={cn(
              "grid h-8 w-8 place-items-center rounded-md border transition-colors",
              task.done
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-primary",
            )}
            aria-label={task.done ? "Marcar tarefa como pendente" : "Marcar tarefa como concluida"}
            title={task.done ? "Marcar como pendente" : "Concluir"}
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="grid h-8 w-8 place-items-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:text-destructive"
            aria-label="Remover tarefa"
            title="Remover"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </span>
      </div>
    );
  }

  return (
    <Link
      href={task.href}
      className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-border bg-background/58 p-3 transition-colors hover:border-primary/35 hover:bg-primary/5"
    >
      {content}
      <Badge variant={task.done ? "success" : "outline"} className="text-xs">
        {task.badge}
      </Badge>
    </Link>
  );
}

function buildCustomProfileTasks(tasks: CustomTask[]): ProfileTask[] {
  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    detail: `${labelFor(taskCategoryOptions, task.category)} - ${task.minutes} min - ${formatTaskDue(task.due)}`,
    href: "/perfil",
    done: task.done,
    icon: iconForTaskCategory(task.category),
    badge: task.done ? "ok" : "manual",
    note: task.note,
    custom: true,
  }));
}

function buildProfileTasks(data: Dashboard | null): ProfileTask[] {
  const goalTasks =
    data?.goals.slice(0, 3).map((goal) => ({
      title: goal.title,
      detail: goal.completed ? "Meta concluida" : `${goal.current}/${goal.target} ${goal.unit}`,
      href: hrefForGoal(goal.title),
      done: goal.completed,
      icon: Target,
      badge: goal.completed ? "ok" : "meta",
    })) ?? [];

  const exerciseTasks =
    data?.pending_exercises.slice(0, Math.max(0, 4 - goalTasks.length)).map((exercise) => ({
      title: `Treinar ${exercise.skill}`,
      detail: difficultyLabel(exercise.difficulty),
      href: "/games",
      icon: ClipboardList,
      badge: "treino",
    })) ?? [];

  const lessonTasks =
    data?.suggested_lessons.slice(0, Math.max(0, 4 - goalTasks.length - exerciseTasks.length)).map((lesson) => ({
      title: lesson.title,
      detail: lesson.module,
      href: `/aulas/${lesson.id}`,
      icon: BookOpen,
      badge: "aula",
    })) ?? [];

  const reviewTask =
    data?.recurrent_errors?.[0] && goalTasks.length + exerciseTasks.length + lessonTasks.length < 4
      ? [
          {
            title: "Revisar erro recorrente",
            detail: data.recurrent_errors[0],
            href: "/redacoes",
            icon: FileText,
            badge: "revisao",
          },
        ]
      : [];

  const tasks = [...goalTasks, ...exerciseTasks, ...lessonTasks, ...reviewTask].slice(0, 4);
  if (tasks.length) return tasks;

  return [
    { title: "Escrever uma redacao", detail: "Primeira tarefa da rotina", href: "/redacao", icon: PenLine, badge: "hoje" },
    { title: "Assistir uma aula", detail: "Avance na trilha", href: "/aulas", icon: BookOpen, badge: "aula" },
    { title: "Treinar uma habilidade", detail: "Exercicio rapido", href: "/games", icon: ClipboardList, badge: "treino" },
    { title: "Reservar tempo", detail: "Defina minutos diarios", href: "/perfil", icon: Clock3, badge: "rotina" },
  ];
}

function hrefForGoal(title: string) {
  const normalized = title.toLowerCase();
  if (normalized.includes("aula")) return "/aulas";
  if (normalized.includes("redacao") || normalized.includes("redacoes")) return "/redacao";
  if (normalized.includes("exercicio") || normalized.includes("treino")) return "/games";
  return "/dashboard";
}

function difficultyLabel(value: string) {
  if (value === "hard") return "nivel avancado";
  if (value === "medium") return "nivel intermediario";
  return "nivel essencial";
}

function labelFor(options: { value: string; label: string }[], value: string) {
  return options.find((item) => item.value === value)?.label ?? value;
}

function iconForTaskCategory(value: string): LucideIcon {
  if (value === "aula") return BookOpen;
  if (value === "treino") return ClipboardList;
  if (value === "revisao") return FileText;
  return PenLine;
}

function formatTaskDue(value: string) {
  if (!value) return "sem prazo";
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function createTaskDraft(): CustomTask {
  return {
    id: "",
    title: "",
    category: "redacao",
    minutes: 30,
    due: new Date().toISOString().slice(0, 10),
    note: "",
    done: false,
  };
}

function getInitialDefinition(): TaskDefinition {
  if (typeof window === "undefined") return defaultDefinition;

  try {
    const raw = localStorage.getItem(TASK_DEFINITION_KEY);
    return raw ? { ...defaultDefinition, ...JSON.parse(raw) } : defaultDefinition;
  } catch {
    return defaultDefinition;
  }
}

function getInitialCustomTasks(): CustomTask[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(CUSTOM_TASKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
