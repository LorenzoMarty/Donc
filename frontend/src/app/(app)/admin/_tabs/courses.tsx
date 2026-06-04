"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Folder,
  FolderPlus,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { apiFetch } from "@/services/api";
import type { AdminCourse, AdminLesson, AdminModule } from "@/types/api";

type ModalState =
  | { kind: "course"; mode: "create" }
  | { kind: "course"; mode: "edit"; course: AdminCourse }
  | { kind: "module"; mode: "create"; courseId: number }
  | { kind: "module"; mode: "edit"; courseId: number; module: AdminModule }
  | { kind: "lesson"; mode: "create"; moduleId: number }
  | { kind: "lesson"; mode: "edit"; moduleId: number; lesson: AdminLesson }
  | null;

export function CoursesTab({
  courses,
  onCourseCreated,
  onCourseChanged,
  onCourseRemoved,
  onModuleCreated,
  onLessonCreated,
}: {
  courses: AdminCourse[];
  onCourseCreated: (course: AdminCourse) => void;
  onCourseChanged: (course: AdminCourse) => void;
  onCourseRemoved: (courseId: number) => void;
  onModuleCreated: (courseId: number, module: AdminModule) => void;
  onLessonCreated: (moduleId: number, lesson: AdminLesson) => void;
}) {
  const [modal, setModal] = useState<ModalState>(null);

  async function moveModule(moduleId: number, direction: "up" | "down") {
    try {
      const course = await apiFetch<AdminCourse>(`/admin/modules/${moduleId}/move`, {
        method: "POST",
        body: JSON.stringify({ direction }),
      });
      onCourseChanged(course);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nao foi possivel reordenar.");
    }
  }

  async function moveLesson(lessonId: number, direction: "up" | "down") {
    try {
      const course = await apiFetch<AdminCourse>(`/admin/lessons/${lessonId}/move`, {
        method: "POST",
        body: JSON.stringify({ direction }),
      });
      onCourseChanged(course);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nao foi possivel reordenar.");
    }
  }

  async function deleteCourse(course: AdminCourse) {
    if (!window.confirm(`Excluir o curso "${course.title}" e todos os modulos/aulas? Esta acao nao pode ser desfeita.`)) return;
    try {
      await apiFetch(`/admin/courses/${course.id}`, { method: "DELETE" });
      onCourseRemoved(course.id);
      toast.success("Curso excluido.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nao foi possivel excluir.");
    }
  }

  async function deleteModule(module: AdminModule) {
    if (!window.confirm(`Excluir o modulo "${module.title}" e suas aulas?`)) return;
    try {
      const course = await apiFetch<AdminCourse>(`/admin/modules/${module.id}`, { method: "DELETE" });
      onCourseChanged(course);
      toast.success("Modulo excluido.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nao foi possivel excluir.");
    }
  }

  async function deleteLesson(lesson: AdminLesson) {
    if (!window.confirm(`Excluir a aula "${lesson.title}"?`)) return;
    try {
      const course = await apiFetch<AdminCourse>(`/admin/lessons/${lesson.id}`, { method: "DELETE" });
      onCourseChanged(course);
      toast.success("Aula excluida.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nao foi possivel excluir.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Estrutura de conteudo</Badge>
          <Badge variant="outline">{courses.length} cursos</Badge>
        </div>
        <Button type="button" size="sm" onClick={() => setModal({ kind: "course", mode: "create" })}>
          <FolderPlus className="h-4 w-4" aria-hidden="true" />
          Novo curso
        </Button>
      </div>

      <div className="grid gap-3">
        {courses.map((course) => (
          <CourseNode
            key={course.id}
            course={course}
            onEdit={() => setModal({ kind: "course", mode: "edit", course })}
            onDelete={() => deleteCourse(course)}
            onAddModule={() => setModal({ kind: "module", mode: "create", courseId: course.id })}
            onEditModule={(module) => setModal({ kind: "module", mode: "edit", courseId: course.id, module })}
            onDeleteModule={deleteModule}
            onMoveModule={moveModule}
            onAddLesson={(moduleId) => setModal({ kind: "lesson", mode: "create", moduleId })}
            onEditLesson={(moduleId, lesson) => setModal({ kind: "lesson", mode: "edit", moduleId, lesson })}
            onDeleteLesson={deleteLesson}
            onMoveLesson={moveLesson}
          />
        ))}
        {!courses.length ? (
          <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Nenhum curso cadastrado.</p>
        ) : null}
      </div>

      {modal?.kind === "course" ? (
        <CourseModal
          state={modal}
          onClose={() => setModal(null)}
          onCreated={(course) => {
            onCourseCreated(course);
            setModal(null);
          }}
          onUpdated={(course) => {
            onCourseChanged(course);
            setModal(null);
          }}
        />
      ) : null}

      {modal?.kind === "module" ? (
        <ModuleModal
          state={modal}
          onClose={() => setModal(null)}
          onCreated={(courseId, module) => {
            onModuleCreated(courseId, module);
            setModal(null);
          }}
          onUpdated={(course) => {
            onCourseChanged(course);
            setModal(null);
          }}
        />
      ) : null}

      {modal?.kind === "lesson" ? (
        <LessonModal
          state={modal}
          onClose={() => setModal(null)}
          onCreated={(moduleId, lesson) => {
            onLessonCreated(moduleId, lesson);
            setModal(null);
          }}
          onUpdated={(course) => {
            onCourseChanged(course);
            setModal(null);
          }}
        />
      ) : null}
    </div>
  );
}

function CourseNode({
  course,
  onEdit,
  onDelete,
  onAddModule,
  onEditModule,
  onDeleteModule,
  onMoveModule,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
  onMoveLesson,
}: {
  course: AdminCourse;
  onEdit: () => void;
  onDelete: () => void;
  onAddModule: () => void;
  onEditModule: (module: AdminModule) => void;
  onDeleteModule: (module: AdminModule) => void;
  onMoveModule: (moduleId: number, direction: "up" | "down") => void;
  onAddLesson: (moduleId: number) => void;
  onEditLesson: (moduleId: number, lesson: AdminLesson) => void;
  onDeleteLesson: (lesson: AdminLesson) => void;
  onMoveLesson: (lessonId: number, direction: "up" | "down") => void;
}) {
  const [open, setOpen] = useState(true);
  const modules = [...course.modules].sort((a, b) => a.order - b.order);

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-start gap-3 border-b px-4 py-3">
        <button type="button" onClick={() => setOpen((v) => !v)} className="mt-0.5 text-muted-foreground" aria-label="Expandir">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <Folder className="mt-0.5 h-5 w-5 shrink-0" style={{ color: course.color }} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{course.title}</p>
          <p className="text-xs text-muted-foreground">{course.slug} · {modules.length} modulos</p>
        </div>
        <RowActions onEdit={onEdit} onDelete={onDelete} />
      </div>

      {open ? (
        <div className="grid gap-2 p-3">
          {modules.map((module, index) => (
            <ModuleNode
              key={module.id}
              module={module}
              isFirst={index === 0}
              isLast={index === modules.length - 1}
              onEdit={() => onEditModule(module)}
              onDelete={() => onDeleteModule(module)}
              onMove={(direction) => onMoveModule(module.id, direction)}
              onAddLesson={() => onAddLesson(module.id)}
              onEditLesson={(lesson) => onEditLesson(module.id, lesson)}
              onDeleteLesson={onDeleteLesson}
              onMoveLesson={onMoveLesson}
            />
          ))}
          <Button type="button" variant="outline" size="sm" className="justify-start" onClick={onAddModule}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Novo modulo
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ModuleNode({
  module,
  isFirst,
  isLast,
  onEdit,
  onDelete,
  onMove,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
  onMoveLesson,
}: {
  module: AdminModule;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (direction: "up" | "down") => void;
  onAddLesson: () => void;
  onEditLesson: (lesson: AdminLesson) => void;
  onDeleteLesson: (lesson: AdminLesson) => void;
  onMoveLesson: (lessonId: number, direction: "up" | "down") => void;
}) {
  const lessons = [...module.lessons].sort((a, b) => a.order - b.order);

  return (
    <div className="rounded-md border bg-background/40 p-3">
      <div className="flex items-start gap-2">
        <Folder className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{module.order}. {module.title}</p>
          <p className="text-xs text-muted-foreground">{lessons.length} aulas</p>
        </div>
        <MoveButtons isFirst={isFirst} isLast={isLast} onMove={onMove} />
        <RowActions onEdit={onEdit} onDelete={onDelete} />
      </div>

      <div className="mt-2 grid gap-1 pl-6">
        {lessons.map((lesson, index) => (
          <div key={lesson.id} className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/50">
            <BookOpen className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-xs">{lesson.order}. {lesson.title}</span>
            <span className="text-[0.65rem] text-muted-foreground">{lesson.duration_minutes}min</span>
            <MoveButtons isFirst={index === 0} isLast={index === lessons.length - 1} onMove={(d) => onMoveLesson(lesson.id, d)} />
            <RowActions onEdit={() => onEditLesson(lesson)} onDelete={() => onDeleteLesson(lesson)} small />
          </div>
        ))}
        <Button type="button" variant="ghost" size="sm" className="justify-start text-xs" onClick={onAddLesson}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Nova aula
        </Button>
      </div>
    </div>
  );
}

function MoveButtons({ isFirst, isLast, onMove }: { isFirst: boolean; isLast: boolean; onMove: (direction: "up" | "down") => void }) {
  return (
    <div className="flex shrink-0">
      <button
        type="button"
        disabled={isFirst}
        onClick={() => onMove("up")}
        className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
        aria-label="Mover para cima"
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        disabled={isLast}
        onClick={() => onMove("down")}
        className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
        aria-label="Mover para baixo"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function RowActions({ onEdit, onDelete, small }: { onEdit: () => void; onDelete: () => void; small?: boolean }) {
  const size = small ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <div className="flex shrink-0">
      <button
        type="button"
        onClick={onEdit}
        className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Editar"
      >
        <Pencil className={size} />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        aria-label="Excluir"
      >
        <Trash2 className={size} />
      </button>
    </div>
  );
}

function CourseModal({
  state,
  onClose,
  onCreated,
  onUpdated,
}: {
  state: Extract<ModalState, { kind: "course" }>;
  onClose: () => void;
  onCreated: (course: AdminCourse) => void;
  onUpdated: (course: AdminCourse) => void;
}) {
  const editing = state.mode === "edit" ? state.course : null;
  const [title, setTitle] = useState(editing?.title ?? "");
  const [slug, setSlug] = useState(editing?.slug ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [color, setColor] = useState(editing?.color ?? "#65BE02");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim() || !description.trim()) {
      toast.error("Informe titulo e descricao.");
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        const course = await apiFetch<AdminCourse>(`/admin/courses/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({ title, description, color }),
        });
        onUpdated(course);
        toast.success("Curso atualizado.");
      } else {
        const course = await apiFetch<AdminCourse>("/admin/courses", {
          method: "POST",
          body: JSON.stringify({ title, slug: slug || null, description, color }),
        });
        onCreated(course);
        toast.success("Curso criado.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nao foi possivel salvar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={editing ? "Editar curso" : "Novo curso"}>
      <div className="grid gap-3">
        <Field label="Titulo">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        {!editing ? (
          <Field label="Slug opcional">
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
          </Field>
        ) : null}
        <Field label="Descricao">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Cor">
          <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </Field>
        <ModalActions busy={busy} onClose={onClose} onSubmit={submit} />
      </div>
    </Modal>
  );
}

function ModuleModal({
  state,
  onClose,
  onCreated,
  onUpdated,
}: {
  state: Extract<ModalState, { kind: "module" }>;
  onClose: () => void;
  onCreated: (courseId: number, module: AdminModule) => void;
  onUpdated: (course: AdminCourse) => void;
}) {
  const editing = state.mode === "edit" ? state.module : null;
  const [title, setTitle] = useState(editing?.title ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim() || !description.trim()) {
      toast.error("Informe titulo e descricao.");
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        const course = await apiFetch<AdminCourse>(`/admin/modules/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({ title, description }),
        });
        onUpdated(course);
        toast.success("Modulo atualizado.");
      } else {
        const createdModule = await apiFetch<AdminModule>(`/admin/courses/${state.courseId}/modules`, {
          method: "POST",
          body: JSON.stringify({ title, description }),
        });
        onCreated(state.courseId, createdModule);
        toast.success("Modulo criado.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nao foi possivel salvar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={editing ? "Editar modulo" : "Novo modulo"}>
      <div className="grid gap-3">
        <Field label="Titulo">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Descricao">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <ModalActions busy={busy} onClose={onClose} onSubmit={submit} />
      </div>
    </Modal>
  );
}

function LessonModal({
  state,
  onClose,
  onCreated,
  onUpdated,
}: {
  state: Extract<ModalState, { kind: "lesson" }>;
  onClose: () => void;
  onCreated: (moduleId: number, lesson: AdminLesson) => void;
  onUpdated: (course: AdminCourse) => void;
}) {
  const editing = state.mode === "edit" ? state.lesson : null;
  const [title, setTitle] = useState(editing?.title ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [summary, setSummary] = useState(editing?.summary ?? "");
  const [durationMinutes, setDurationMinutes] = useState(String(editing?.duration_minutes ?? 15));
  const [videoUrl, setVideoUrl] = useState(editing?.video_url ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(editing?.thumbnail_url ?? "");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim() || !description.trim() || !summary.trim()) {
      toast.error("Preencha titulo, descricao e resumo.");
      return;
    }
    setBusy(true);
    const body = {
      title,
      description,
      summary,
      duration_minutes: Number(durationMinutes),
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl,
    };
    try {
      if (editing) {
        const course = await apiFetch<AdminCourse>(`/admin/lessons/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        onUpdated(course);
        toast.success("Aula atualizada.");
      } else {
        const lesson = await apiFetch<AdminLesson>(`/admin/modules/${state.moduleId}/lessons`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        onCreated(state.moduleId, lesson);
        toast.success("Aula criada.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nao foi possivel salvar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={editing ? "Editar aula" : "Nova aula"}>
      <div className="grid gap-3">
        <Field label="Titulo">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Descricao">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Resumo">
          <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} className="min-h-24" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Duracao (min)">
            <Input type="number" min={1} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
          </Field>
          <Field label="Video URL">
            <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
          </Field>
        </div>
        <Field label="Thumbnail URL">
          <Input value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} />
        </Field>
        <ModalActions busy={busy} onClose={onClose} onSubmit={submit} />
      </div>
    </Modal>
  );
}

function ModalActions({ busy, onClose, onSubmit }: { busy: boolean; onClose: () => void; onSubmit: () => void }) {
  return (
    <div className="mt-1 flex justify-end gap-2">
      <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
        Cancelar
      </Button>
      <Button type="button" onClick={onSubmit} disabled={busy}>
        Salvar
      </Button>
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

function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-20 rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/20 ${className ?? ""}`}
    />
  );
}
