"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, Clock3, Layers3, ListChecks } from "lucide-react";

import { LoadingCard } from "@/components/shared/loading-card";
import { MotionShell } from "@/components/shared/motion-shell";
import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { Progress } from "@/components/ui/progress";
import { apiFetch, type Course } from "@/services/api";

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
    <MotionShell className="space-y-6">
      <PageHeader
        eyebrow="Cursos"
        title="Aulas organizadas por curso"
        description="Comece por Destrave a redação: módulos curtos para tema, tese, argumentos, coesão e intervenção."
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
  const [selectedModuleId, setSelectedModuleId] = useState(course.modules[0]?.id ?? 0);
  const lessons = course.modules.flatMap((module) => module.lessons);
  const completedLessons = lessons.filter((lesson) => lesson.progress.completed).length;
  const courseProgress = lessons.length
    ? Math.round(lessons.reduce((sum, lesson) => sum + lesson.progress.progress_percent, 0) / lessons.length)
    : 0;

  const selectedModule = course.modules.find((module) => module.id === selectedModuleId) ?? course.modules[0];
  const safeSelectedModuleId = selectedModule?.id ?? 0;
  const moduleLessons = selectedModule?.lessons ?? [];
  const completedModuleLessons = moduleLessons.filter((lesson) => lesson.progress.completed).length;
  const moduleProgress = moduleLessons.length
    ? Math.round(moduleLessons.reduce((sum, lesson) => sum + lesson.progress.progress_percent, 0) / moduleLessons.length)
    : 0;
  const selectId = `course-${course.id}-module`;

  return (
    <section className="space-y-4">
      <Surface>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(13rem,15rem)] lg:items-center">
          <div className="flex items-start gap-3">
            <span className="mt-1 h-3 w-3 rounded-full" style={{ backgroundColor: course.color }} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Curso inicial</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-normal">{course.title}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{course.description}</p>
            </div>
          </div>
          <div className="game-tile bg-background/58 p-3">
            <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <span>Progresso</span>
              <Layers3 className="h-4 w-4 text-secondary" aria-hidden="true" />
            </div>
            <p className="text-2xl font-semibold">{courseProgress}%</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {completedLessons}/{lessons.length} aulas concluidas
            </p>
            <Progress value={courseProgress} className="mt-3" />
          </div>
        </div>
      </Surface>

      <Surface>
        <div className="grid gap-4 lg:grid-cols-[minmax(15rem,18rem)_minmax(0,1fr)]">
          <div>
            <label htmlFor={selectId} className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Modulo
            </label>
            <div className="relative mt-2">
              <select
                id={selectId}
                value={safeSelectedModuleId}
                onChange={(event) => setSelectedModuleId(Number(event.target.value))}
                className="h-11 w-full appearance-none rounded-md border border-input bg-card px-3.5 pr-10 text-base font-semibold text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-ring/15 md:text-sm"
              >
                {course.modules.map((module) => (
                  <option key={module.id} value={module.id}>
                    {module.title}
                  </option>
                ))}
              </select>
              <ListChecks
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary"
                aria-hidden="true"
              />
            </div>

            {selectedModule ? (
              <div className="mt-4 rounded-md border border-border bg-background/58 p-3">
                <p className="font-semibold">{selectedModule.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{selectedModule.description}</p>
                <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>
                    {completedModuleLessons}/{moduleLessons.length} aulas concluidas
                  </span>
                  <span>{moduleProgress}%</span>
                </div>
                <Progress value={moduleProgress} className="mt-2" />
              </div>
            ) : null}
          </div>

          <div className="grid gap-3">
            {moduleLessons.map((lesson) => (
              <Link
                key={lesson.id}
                href={`/aulas/${lesson.id}`}
                className="game-tile group grid gap-3 bg-background/58 p-3 transition-colors hover:bg-muted/60 sm:grid-cols-[112px_1fr] lg:grid-cols-[120px_1fr_auto]"
              >
                <Image
                  src={lesson.thumbnail_url}
                  alt=""
                  width={120}
                  height={80}
                  unoptimized
                  className="aspect-video h-auto w-full rounded-md border border-border object-cover opacity-90 sm:aspect-auto sm:h-20 sm:w-[112px] lg:w-[120px]"
                />
                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                    {lesson.duration_minutes} min
                  </div>
                  <p className="font-semibold">{lesson.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{lesson.description}</p>
                  <Progress value={lesson.progress.progress_percent} className="mt-3" />
                </div>
                <div className="flex items-center justify-end gap-2 text-sm font-semibold text-primary sm:col-span-2 lg:col-span-1 lg:justify-center">
                  <BookOpen className="h-4 w-4" aria-hidden="true" />
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </Surface>
    </section>
  );
}
