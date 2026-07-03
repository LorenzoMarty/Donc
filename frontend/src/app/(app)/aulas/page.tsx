"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ClipboardList, Flame, LockKeyhole, type LucideIcon } from "lucide-react";

import { LessonPosterCard } from "@/components/shared/lesson-poster-card";
import { LoadingCard } from "@/components/shared/loading-card";
import { MotionShell } from "@/components/shared/motion-shell";
import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { Rail } from "@/components/shared/rail";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { apiFetch, type Course, type Lesson } from "@/services/api";
import type { ModuleItem } from "@/types/api";
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
      <div className="fluid-grid gap-3 [--grid-min:16rem]">
        <LoadingCard />
        <LoadingCard />
      </div>
    );
  }

  return (
    <MotionShell className="space-y-3">
      <PageHeader
        eyebrow="Cursos"
        title="Trilha de aulas"
        description="Avance pelos módulos na ordem. Cada aula concluída dá XP; fechar um módulo dá bônus."
      />

      <div className="space-y-3">
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
  const [openModules, setOpenModules] = useState<Record<number, boolean>>(() => (modules[0] ? { [modules[0].id]: true } : {}));

  function toggleModule(moduleId: number) {
    setOpenModules((current) => ({ ...current, [moduleId]: !current[moduleId] }));
  }

  return (
    <section className="space-y-2.5">
      <Surface className="relative overflow-hidden p-4 lg:p-4">
        <div
          className="absolute inset-x-0 top-0 h-1"
          style={{ backgroundColor: course.color || "hsl(var(--primary))" }}
          aria-hidden="true"
        />
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,23rem)] xl:items-center">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Trilha</Badge>
              <Badge variant="outline">{course.xp_reward ?? 200}xp bonus</Badge>
              {course.completed ? <Badge variant="success">concluido</Badge> : null}
            </div>
            <h2 className="text-safe text-xl font-semibold tracking-normal">{course.title}</h2>
            <p className="mt-1.5 max-w-3xl text-sm leading-5 text-muted-foreground">{course.description}</p>
          </div>

          <div className="grid gap-2.5">
            <div>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold">
                <span>Progresso do curso</span>
                <span>{courseProgress}%</span>
              </div>
              <Progress value={courseProgress} className="h-2" />
              <p className="mt-1.5 text-xs text-muted-foreground">
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

      <div className="space-y-2.5">
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
  const items = module.items?.length ? module.items : lessons.map((lesson) => ({ id: -lesson.id, kind: "lesson" as const, order: lesson.order, lesson, activity: null }));
  const completedLessons = lessons.filter((lesson) => lesson.progress.completed).length;
  const moduleProgress = module.progress_percent ?? progressFromLessons(lessons);

  return (
    <Surface className="p-4 lg:p-4">
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 text-left" aria-expanded={open}>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border bg-background/58 text-sm font-semibold">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-safe text-lg font-semibold tracking-normal">{module.title}</h3>
            {module.completed ? <Badge variant="success">módulo concluído</Badge> : null}
            <Badge variant="outline">{module.xp_reward ?? 75}xp bonus</Badge>
          </div>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{module.description}</p>
        </div>
        <div className="hidden min-w-[12rem] items-center gap-3 md:flex">
          <Progress value={moduleProgress} className="h-1.5" />
          <span className="w-10 text-right text-sm font-semibold">{moduleProgress}%</span>
        </div>
        <ChevronDown
          className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div className="mt-4 border-t border-border pt-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Conteúdo do módulo</p>
            <span className="text-xs font-semibold text-muted-foreground">
              {completedLessons}/{lessons.length} aulas
            </span>
          </div>
          <Rail>
            {items.map((item) =>
              item.kind === "lesson" && item.lesson ? (
                <LessonPosterCard
                  key={`lesson-${item.id}`}
                  lesson={{
                    id: item.lesson.id,
                    title: item.lesson.title,
                    href: `/aulas/${item.lesson.id}`,
                    thumbnailUrl: item.lesson.thumbnail_url,
                    durationMinutes: item.lesson.duration_minutes,
                    xpReward: item.lesson.xp_reward,
                    progressPercent: item.lesson.progress?.progress_percent ?? 0,
                    completed: item.lesson.progress?.completed ?? false,
                    fallbackSeed: item.lesson.title,
                  }}
                />
              ) : null,
            )}
          </Rail>
          <div className="mt-3 grid gap-1.5">
            {items.map((item) =>
              item.kind !== "lesson" && item.activity ? (
                <ActivityRow key={`activity-${item.id}`} item={item} moduleOrder={module.order} />
              ) : null,
            )}
          </div>
        </div>
      ) : null}
    </Surface>
  );
}

function ActivityRow({ item, moduleOrder }: { item: ModuleItem; moduleOrder: number }) {
  const activity = item.activity;
  if (!activity) return null;
  return (
    <div className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-background/35 px-2.5 py-1.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center text-amber-600">
        <ClipboardList className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-safe block text-sm font-semibold">
          {moduleOrder}.{item.order} - Atividade de fixação
        </span>
        <span className="line-clamp-1 text-xs text-muted-foreground">{activity.statement}</span>
      </span>
      <Badge variant="outline" className="shrink-0 text-xs">{difficultyLabel[activity.difficulty] ?? "essencial"}</Badge>
    </div>
  );
}

function CompactMetric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/58 p-2.5">
      <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
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
