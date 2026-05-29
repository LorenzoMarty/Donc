"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, CheckCircle2, ChevronDown, CirclePlay, Flame, LockKeyhole, type LucideIcon } from "lucide-react";

import { LoadingCard } from "@/components/shared/loading-card";
import { MotionShell } from "@/components/shared/motion-shell";
import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { apiFetch, type Course, type Lesson } from "@/services/api";
import { cn } from "@/utils";

type CourseModule = Course["modules"][number];

const difficultyLabel: Record<string, string> = {
  easy: "essencial",
  medium: "intermediaria",
  hard: "avancada",
};

export default function LessonsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Course[]>("/lessons/courses")
      .then(setCourses)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="fluid-grid gap-4 [--grid-min:16rem]">
        <LoadingCard />
        <LoadingCard />
      </div>
    );
  }

  return (
    <MotionShell className="space-y-5">
      <PageHeader
        eyebrow="Cursos"
        title="Trilha de aulas"
        description="Curso, modulos e aulas em uma sequencia unica. Concluir aulas libera XP; fechar modulos e o curso libera bonus maiores."
      />

      <div className="space-y-5">
        {courses.map((course) => (
          <CoursePanel key={course.id} course={course} />
        ))}
      </div>
    </MotionShell>
  );
}

function CoursePanel({ course }: { course: Course }) {
  const modules = course.modules ?? [];
  const lessons = modules.flatMap((module) => module.lessons ?? []);
  const completedLessons = lessons.filter((lesson) => lesson.progress.completed).length;
  const courseProgress = course.progress_percent ?? progressFromLessons(lessons);
  const rank = course.user_rank;
  const [openModules, setOpenModules] = useState<Record<number, boolean>>(() =>
    modules[0] ? { [modules[0].id]: true } : {},
  );

  function toggleModule(moduleId: number) {
    setOpenModules((current) => ({ ...current, [moduleId]: !current[moduleId] }));
  }

  return (
    <section className="space-y-3">
      <Surface className="p-4 lg:p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,23rem)] xl:items-center">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Curso</Badge>
              <Badge variant="outline">{course.xp_reward ?? 200}xp bonus</Badge>
              {course.completed ? <Badge variant="success">concluido</Badge> : null}
            </div>
            <h2 className="text-safe text-2xl font-semibold tracking-normal">{course.title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{course.description}</p>
          </div>

          <div className="grid gap-3">
            <div>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold">
                <span>Progresso do curso</span>
                <span>{courseProgress}%</span>
              </div>
              <Progress value={courseProgress} className="h-2" />
              <p className="mt-2 text-xs text-muted-foreground">
                {completedLessons}/{lessons.length} aulas concluidas
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <CompactMetric icon={Flame} label="Rank" value={rank?.name ?? "Aprendiz"} />
              <CompactMetric
                icon={LockKeyhole}
                label="Exercicios"
                value={difficultyLabel[rank?.exercise_difficulty ?? "easy"] ?? "essencial"}
              />
            </div>
          </div>
        </div>
      </Surface>

      <div className="space-y-3">
        {modules.map((module, index) => (
          <ModuleAccordion
            key={module.id}
            module={module}
            index={index}
            open={Boolean(openModules[module.id])}
            onToggle={() => toggleModule(module.id)}
          />
        ))}
      </div>
    </section>
  );
}

function ModuleAccordion({ module, index, open, onToggle }: { module: CourseModule; index: number; open: boolean; onToggle: () => void }) {
  const lessons = module.lessons ?? [];
  const completedLessons = lessons.filter((lesson) => lesson.progress.completed).length;
  const moduleProgress = module.progress_percent ?? progressFromLessons(lessons);

  return (
    <Surface className="p-4 lg:p-5">
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 text-left" aria-expanded={open}>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border bg-background/58 text-sm font-semibold">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-safe text-lg font-semibold tracking-normal">{module.title}</h3>
            {module.completed ? <Badge variant="success">modulo concluido</Badge> : null}
            <Badge variant="outline">{module.xp_reward ?? 75}xp bonus</Badge>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{module.description}</p>
        </div>
        <div className="hidden min-w-[12rem] items-center gap-3 md:flex">
          <Progress value={moduleProgress} className="h-1.5" />
          <span className="w-10 text-right text-sm font-semibold">{moduleProgress}%</span>
        </div>
        <ChevronDown className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>

      {open ? (
        <div className="mt-5 border-t border-border pt-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Conteudo do modulo</p>
            <span className="text-xs font-semibold text-muted-foreground">
              {completedLessons}/{lessons.length} aulas
            </span>
          </div>
          <div className="grid gap-2">
            {lessons.map((lesson) => (
              <LessonRow key={lesson.id} lesson={lesson} moduleOrder={module.order} />
            ))}
          </div>
        </div>
      ) : null}
    </Surface>
  );
}

function LessonRow({ lesson, moduleOrder }: { lesson: Lesson; moduleOrder: number }) {
  const completed = lesson.progress.completed;

  return (
    <Link
      href={`/aulas/${lesson.id}`}
      className="group flex min-h-12 items-center gap-3 rounded-md border border-transparent bg-background/35 px-2.5 py-2 transition-colors hover:border-primary/25 hover:bg-primary/8"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center text-primary">
        {completed ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : <CirclePlay className="h-5 w-5" aria-hidden="true" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-safe block text-sm font-semibold">
          {moduleOrder}.{lesson.order} - {lesson.title}
        </span>
        <span className="text-xs text-muted-foreground">{lesson.duration_minutes} min</span>
      </span>
      <span className="game-chip shrink-0 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{lesson.xp_reward ?? 25}xp</span>
      <BookOpen className="hidden h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary sm:block" aria-hidden="true" />
    </Link>
  );
}

function CompactMetric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/58 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        {label}
      </div>
      <p className="text-safe text-sm font-semibold">{value}</p>
    </div>
  );
}

function progressFromLessons(lessons: Lesson[]) {
  if (!lessons.length) return 0;
  return Math.round(lessons.reduce((sum, lesson) => sum + (lesson.progress?.progress_percent ?? 0), 0) / lessons.length);
}
