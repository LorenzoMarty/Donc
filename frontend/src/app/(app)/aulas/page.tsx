"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, Clock3 } from "lucide-react";

import { LoadingCard } from "@/components/shared/loading-card";
import { MotionShell } from "@/components/shared/motion-shell";
import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { Progress } from "@/components/ui/progress";
import { apiFetch, type Subject } from "@/services/api";

export default function LessonsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Subject[]>("/lessons/subjects")
      .then(setSubjects)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <LoadingCard />
        <LoadingCard />
      </div>
    );
  }

  return (
    <MotionShell className="space-y-6">
      <PageHeader
        eyebrow="Trilhas guiadas"
        title="Aulas em ritmo de sprint"
        description="Módulos curtos, progresso visível e prática conectada a cada habilidade."
      />

      <div className="space-y-5">
        {subjects.map((subject) => (
          <section key={subject.id} className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: subject.color }} />
              <div>
                <h2 className="text-xl font-bold tracking-normal">{subject.title}</h2>
                <p className="text-sm text-muted-foreground">{subject.description}</p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {subject.modules.map((module) => (
                <Surface key={module.id}>
                  <div className="mb-4">
                    <h3 className="text-xl font-black tracking-normal">{module.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{module.description}</p>
                  </div>
                  <div className="grid gap-3">
                    {module.lessons.map((lesson) => (
                      <Link key={lesson.id} href={`/aulas/${lesson.id}`} className="game-tile group grid gap-3 bg-background p-3 transition-colors hover:bg-muted md:grid-cols-[120px_1fr_auto]">
                        <img src={lesson.thumbnail_url} alt="" className="h-20 w-full rounded-2xl border-2 border-foreground object-cover md:w-[120px]" />
                        <div className="min-w-0">
                          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                            {lesson.duration_minutes} min
                          </div>
                          <p className="font-semibold">{lesson.title}</p>
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{lesson.description}</p>
                          <Progress value={lesson.progress.progress_percent} className="mt-3" />
                        </div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                          <BookOpen className="h-4 w-4" aria-hidden="true" />
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </Surface>
              ))}
            </div>
          </section>
        ))}
      </div>
    </MotionShell>
  );
}
