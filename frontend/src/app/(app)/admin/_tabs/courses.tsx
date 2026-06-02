"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { BookOpen, Folder, FolderPlus, Plus, type LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/services/api";
import type { AdminCourse, AdminLesson, AdminModule } from "@/types/api";

type CourseDraft = {
  title: string;
  slug: string;
  description: string;
  color: string;
};

type ModuleDraft = {
  courseId: string;
  title: string;
  description: string;
};

type LessonDraft = {
  moduleId: string;
  title: string;
  description: string;
  summary: string;
  duration_minutes: string;
  video_url: string;
  thumbnail_url: string;
};

const emptyCourse: CourseDraft = { title: "", slug: "", description: "", color: "#65BE02" };
const emptyModule: ModuleDraft = { courseId: "", title: "", description: "" };
const emptyLesson: LessonDraft = {
  moduleId: "",
  title: "",
  description: "",
  summary: "",
  duration_minutes: "15",
  video_url: "",
  thumbnail_url: "",
};

export function CoursesTab({
  courses,
  onCourseCreated,
  onModuleCreated,
  onLessonCreated,
}: {
  courses: AdminCourse[];
  onCourseCreated: (course: AdminCourse) => void;
  onModuleCreated: (courseId: number, module: AdminModule) => void;
  onLessonCreated: (moduleId: number, lesson: AdminLesson) => void;
}) {
  const [courseDraft, setCourseDraft] = useState<CourseDraft>(emptyCourse);
  const [moduleDraft, setModuleDraft] = useState<ModuleDraft>(emptyModule);
  const [lessonDraft, setLessonDraft] = useState<LessonDraft>(emptyLesson);
  const [busy, setBusy] = useState<"course" | "module" | "lesson" | null>(null);
  const modules = courses.flatMap((course) => course.modules.map((module) => ({ ...module, courseTitle: course.title })));

  async function createCourse() {
    if (!courseDraft.title.trim() || !courseDraft.description.trim()) {
      toast.error("Informe titulo e descricao do curso.");
      return;
    }
    setBusy("course");
    try {
      const course = await apiFetch<AdminCourse>("/admin/courses", {
        method: "POST",
        body: JSON.stringify({
          title: courseDraft.title,
          slug: courseDraft.slug || null,
          description: courseDraft.description,
          color: courseDraft.color,
        }),
      });
      onCourseCreated(course);
      setCourseDraft(emptyCourse);
      toast.success("Curso criado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nao foi possivel criar o curso.");
    } finally {
      setBusy(null);
    }
  }

  async function createModule() {
    const courseId = Number(moduleDraft.courseId);
    if (!courseId || !moduleDraft.title.trim() || !moduleDraft.description.trim()) {
      toast.error("Escolha o curso e informe titulo e descricao do modulo.");
      return;
    }
    setBusy("module");
    try {
      const createdModule = await apiFetch<AdminModule>(`/admin/courses/${courseId}/modules`, {
        method: "POST",
        body: JSON.stringify({ title: moduleDraft.title, description: moduleDraft.description }),
      });
      onModuleCreated(courseId, createdModule);
      setModuleDraft(emptyModule);
      toast.success("Modulo criado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nao foi possivel criar o modulo.");
    } finally {
      setBusy(null);
    }
  }

  async function createLesson() {
    const moduleId = Number(lessonDraft.moduleId);
    if (!moduleId || !lessonDraft.title.trim() || !lessonDraft.description.trim() || !lessonDraft.summary.trim()) {
      toast.error("Escolha o modulo e preencha titulo, descricao e resumo.");
      return;
    }
    setBusy("lesson");
    try {
      const lesson = await apiFetch<AdminLesson>(`/admin/modules/${moduleId}/lessons`, {
        method: "POST",
        body: JSON.stringify({
          title: lessonDraft.title,
          description: lessonDraft.description,
          summary: lessonDraft.summary,
          duration_minutes: Number(lessonDraft.duration_minutes),
          video_url: lessonDraft.video_url,
          thumbnail_url: lessonDraft.thumbnail_url,
        }),
      });
      onLessonCreated(moduleId, lesson);
      setLessonDraft(emptyLesson);
      toast.success("Aula criada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nao foi possivel criar a aula.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Estrutura de pastas</Badge>
            <Badge variant="outline">{courses.length} cursos</Badge>
          </div>
        </div>
        <div className="grid gap-3 p-4">
          {courses.map((course) => (
            <CourseTree key={course.id} course={course} />
          ))}
          {!courses.length ? <p className="text-sm text-muted-foreground">Nenhum curso cadastrado.</p> : null}
        </div>
      </div>

      <div className="grid gap-4">
        <Panel title="Novo curso" icon={FolderPlus}>
          <Field label="Titulo">
            <Input value={courseDraft.title} onChange={(event) => setCourseDraft({ ...courseDraft, title: event.target.value })} />
          </Field>
          <Field label="Slug opcional">
            <Input value={courseDraft.slug} onChange={(event) => setCourseDraft({ ...courseDraft, slug: event.target.value })} />
          </Field>
          <Field label="Descricao">
            <textarea
              value={courseDraft.description}
              onChange={(event) => setCourseDraft({ ...courseDraft, description: event.target.value })}
              className="min-h-20 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
            />
          </Field>
          <Field label="Cor">
            <Input type="color" value={courseDraft.color} onChange={(event) => setCourseDraft({ ...courseDraft, color: event.target.value })} />
          </Field>
          <Button type="button" onClick={createCourse} disabled={busy === "course"}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Adicionar curso
          </Button>
        </Panel>

        <Panel title="Novo modulo" icon={Folder}>
          <SelectField label="Curso" value={moduleDraft.courseId} onChange={(value) => setModuleDraft({ ...moduleDraft, courseId: value })}>
            <option value="">Selecione</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </SelectField>
          <Field label="Titulo">
            <Input value={moduleDraft.title} onChange={(event) => setModuleDraft({ ...moduleDraft, title: event.target.value })} />
          </Field>
          <Field label="Descricao">
            <textarea
              value={moduleDraft.description}
              onChange={(event) => setModuleDraft({ ...moduleDraft, description: event.target.value })}
              className="min-h-20 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
            />
          </Field>
          <Button type="button" onClick={createModule} disabled={busy === "module"}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Adicionar modulo
          </Button>
        </Panel>

        <Panel title="Nova aula" icon={BookOpen}>
          <SelectField label="Modulo" value={lessonDraft.moduleId} onChange={(value) => setLessonDraft({ ...lessonDraft, moduleId: value })}>
            <option value="">Selecione</option>
            {modules.map((module) => (
              <option key={module.id} value={module.id}>
                {module.courseTitle} / {module.title}
              </option>
            ))}
          </SelectField>
          <Field label="Titulo">
            <Input value={lessonDraft.title} onChange={(event) => setLessonDraft({ ...lessonDraft, title: event.target.value })} />
          </Field>
          <Field label="Descricao">
            <Input value={lessonDraft.description} onChange={(event) => setLessonDraft({ ...lessonDraft, description: event.target.value })} />
          </Field>
          <Field label="Resumo">
            <textarea
              value={lessonDraft.summary}
              onChange={(event) => setLessonDraft({ ...lessonDraft, summary: event.target.value })}
              className="min-h-24 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Duracao (min)">
              <Input
                type="number"
                min={1}
                value={lessonDraft.duration_minutes}
                onChange={(event) => setLessonDraft({ ...lessonDraft, duration_minutes: event.target.value })}
              />
            </Field>
            <Field label="Video URL">
              <Input value={lessonDraft.video_url} onChange={(event) => setLessonDraft({ ...lessonDraft, video_url: event.target.value })} />
            </Field>
          </div>
          <Field label="Thumbnail URL">
            <Input value={lessonDraft.thumbnail_url} onChange={(event) => setLessonDraft({ ...lessonDraft, thumbnail_url: event.target.value })} />
          </Field>
          <Button type="button" onClick={createLesson} disabled={busy === "lesson"}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Adicionar aula
          </Button>
        </Panel>
      </div>
    </div>
  );
}

function CourseTree({ course }: { course: AdminCourse }) {
  return (
    <div className="rounded-md border border-border bg-background/40">
      <div className="flex items-start gap-3 border-b px-4 py-3">
        <Folder className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">{course.title}</p>
          <p className="text-xs text-muted-foreground">{course.slug}</p>
        </div>
      </div>
      <div className="grid gap-2 p-3">
        {course.modules.map((module) => (
          <div key={module.id} className="rounded-md border bg-card p-3">
            <div className="flex items-start gap-2">
              <Folder className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold">{module.order}. {module.title}</p>
                <p className="text-xs text-muted-foreground">{module.lessons.length} aulas</p>
              </div>
            </div>
            <div className="mt-2 grid gap-1 pl-6">
              {module.lessons.map((lesson) => (
                <div key={lesson.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <BookOpen className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  <span>{lesson.order}. {lesson.title}</span>
                </div>
              ))}
              {!module.lessons.length ? <p className="text-xs text-muted-foreground">Sem aulas ainda.</p> : null}
            </div>
          </div>
        ))}
        {!course.modules.length ? <p className="px-1 text-xs text-muted-foreground">Sem modulos ainda.</p> : null}
      </div>
    </div>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="grid gap-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-md border bg-card px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
      >
        {children}
      </select>
    </label>
  );
}
