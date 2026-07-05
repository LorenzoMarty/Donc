"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, ChevronUp, ClipboardList, Folder, FolderPlus, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils";
import { apiFetch } from "@/services/api";
import type { AdminActivity, AdminCourse, AdminLesson, AdminModule, AdminModuleItem } from "@/types/api";

type ModalState =
  | { kind: "course"; mode: "create" }
  | { kind: "course"; mode: "edit"; course: AdminCourse }
  | { kind: "module"; mode: "create"; courseId: number }
  | { kind: "module"; mode: "edit"; courseId: number; module: AdminModule }
  | { kind: "lesson"; mode: "create"; moduleId: number }
  | { kind: "lesson"; mode: "edit"; moduleId: number; lesson: AdminLesson }
  | { kind: "activity"; mode: "create"; module: AdminModule }
  | { kind: "activity"; mode: "edit"; module: AdminModule; activity: AdminActivity }
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
      const course = await apiFetch<AdminCourse>(`/admin/modules/${moduleId}/move`, { method: "POST", body: JSON.stringify({ direction }) });
      onCourseChanged(course);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível reordenar.");
    }
  }

  async function moveItem(item: AdminModuleItem, direction: "up" | "down") {
    try {
      const endpoint = item.id > 0 ? `/admin/module-items/${item.id}/move` : `/admin/lessons/${item.lesson?.id}/move`;
      const course = await apiFetch<AdminCourse>(endpoint, { method: "POST", body: JSON.stringify({ direction }) });
      onCourseChanged(course);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível reordenar.");
    }
  }

  async function deleteCourse(course: AdminCourse) {
    if (!window.confirm(`Excluir o curso "${course.title}" e todo o conteúdo vinculado?`)) return;
    try {
      await apiFetch(`/admin/courses/${course.id}`, { method: "DELETE" });
      onCourseRemoved(course.id);
      toast.success("Curso excluído.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir o curso.");
    }
  }

  async function deleteModule(module: AdminModule) {
    if (!window.confirm(`Excluir o módulo "${module.title}" e suas aulas?`)) return;
    try {
      const course = await apiFetch<AdminCourse>(`/admin/modules/${module.id}`, { method: "DELETE" });
      onCourseChanged(course);
      toast.success("Módulo excluído.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir o módulo.");
    }
  }

  async function deleteLesson(lesson: AdminLesson) {
    if (!window.confirm(`Excluir a aula "${lesson.title}"?`)) return;
    try {
      const course = await apiFetch<AdminCourse>(`/admin/lessons/${lesson.id}`, { method: "DELETE" });
      onCourseChanged(course);
      toast.success("Aula excluída.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir a aula.");
    }
  }

  async function deleteActivity(activity: AdminActivity) {
    if (!window.confirm("Excluir esta atividade?")) return;
    try {
      const course = await apiFetch<AdminCourse>(`/admin/activities/${activity.id}`, { method: "DELETE" });
      onCourseChanged(course);
      toast.success("Atividade excluída.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir a atividade.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Estrutura de conteúdo</Badge>
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
            onAddActivity={(module) => setModal({ kind: "activity", mode: "create", module })}
            onEditActivity={(module, activity) => setModal({ kind: "activity", mode: "edit", module, activity })}
            onDeleteActivity={deleteActivity}
            onMoveItem={moveItem}
          />
        ))}
        {!courses.length ? <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Nenhum curso cadastrado.</p> : null}
      </div>

      {modal?.kind === "course" ? (
        <CourseModal state={modal} onClose={() => setModal(null)} onCreated={(course) => { onCourseCreated(course); setModal(null); }} onUpdated={(course) => { onCourseChanged(course); setModal(null); }} />
      ) : null}
      {modal?.kind === "module" ? (
        <ModuleModal state={modal} onClose={() => setModal(null)} onCreated={(courseId, module) => { onModuleCreated(courseId, module); setModal(null); }} onUpdated={(course) => { onCourseChanged(course); setModal(null); }} />
      ) : null}
      {modal?.kind === "lesson" ? (
        <LessonModal state={modal} onClose={() => setModal(null)} onCreated={(moduleId, lesson) => { onLessonCreated(moduleId, lesson); setModal(null); }} onUpdated={(course) => { onCourseChanged(course); setModal(null); }} />
      ) : null}
      {modal?.kind === "activity" ? (
        <ActivityModal state={modal} onClose={() => setModal(null)} onUpdated={(course) => { onCourseChanged(course); setModal(null); }} />
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
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
  onMoveItem,
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
  onAddActivity: (module: AdminModule) => void;
  onEditActivity: (module: AdminModule, activity: AdminActivity) => void;
  onDeleteActivity: (activity: AdminActivity) => void;
  onMoveItem: (item: AdminModuleItem, direction: "up" | "down") => void;
}) {
  const [open, setOpen] = useState(true);
  const modules = [...course.modules].sort((a, b) => a.order - b.order);

  return (
    <div className="game-tile bg-card">
      <div className="flex items-start gap-3 border-b px-4 py-3">
        <button type="button" onClick={() => setOpen((v) => !v)} className="mt-0.5 text-muted-foreground transition-transform hover:text-foreground" aria-label="Expandir curso">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <Folder className="mt-0.5 h-5 w-5 shrink-0" style={{ color: course.color }} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{course.title}</p>
          <p className="text-xs text-muted-foreground">{course.slug} · {modules.length} módulos</p>
        </div>
        <RowActions onEdit={onEdit} onDelete={onDelete} />
      </div>

      {open ? (
        <div className="collapse-in grid gap-2 p-3">
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
              onAddActivity={() => onAddActivity(module)}
              onEditActivity={(activity) => onEditActivity(module, activity)}
              onDeleteActivity={onDeleteActivity}
              onMoveItem={onMoveItem}
            />
          ))}
          <Button type="button" variant="outline" size="sm" className="justify-start" onClick={onAddModule}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Novo módulo
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
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
  onMoveItem,
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
  onAddActivity: () => void;
  onEditActivity: (activity: AdminActivity) => void;
  onDeleteActivity: (activity: AdminActivity) => void;
  onMoveItem: (item: AdminModuleItem, direction: "up" | "down") => void;
}) {
  const items = normalizedItems(module);

  return (
    <div className="rounded-md border bg-background/40 p-3">
      <div className="flex items-start gap-2">
        <Folder className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{module.order}. {module.title}</p>
          <p className="text-xs text-muted-foreground">{items.length} itens na sequência</p>
        </div>
        <MoveButtons isFirst={isFirst} isLast={isLast} onMove={onMove} />
        <RowActions onEdit={onEdit} onDelete={onDelete} />
      </div>

      <div className="mt-2 grid gap-1 pl-6">
        {items.map((item, index) => (
          <div key={`${item.kind}-${item.id}`} className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/50">
            {item.kind === "lesson" ? <BookOpen className="h-3.5 w-3.5 shrink-0 text-primary" /> : <ClipboardList className="h-3.5 w-3.5 shrink-0 text-amber-600" />}
            <span className="min-w-0 flex-1 truncate text-xs">
              {item.order}. {item.kind === "lesson" ? item.lesson?.title : item.activity?.statement}
            </span>
            <Badge variant="outline" className="shrink-0 text-[0.65rem]">{item.kind === "lesson" ? "aula" : "atividade"}</Badge>
            <MoveButtons isFirst={index === 0} isLast={index === items.length - 1} onMove={(direction) => onMoveItem(item, direction)} />
            {item.kind === "lesson" && item.lesson ? (
              <RowActions onEdit={() => onEditLesson(item.lesson as AdminLesson)} onDelete={() => onDeleteLesson(item.lesson as AdminLesson)} small />
            ) : item.activity ? (
              <RowActions onEdit={() => onEditActivity(item.activity as AdminActivity)} onDelete={() => onDeleteActivity(item.activity as AdminActivity)} small />
            ) : null}
          </div>
        ))}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" className="justify-start text-xs" onClick={onAddLesson}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Nova aula
          </Button>
          <Button type="button" variant="ghost" size="sm" className="justify-start text-xs" onClick={onAddActivity}>
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Nova atividade
          </Button>
        </div>
      </div>
    </div>
  );
}

function normalizedItems(module: AdminModule): AdminModuleItem[] {
  if (module.items?.length) return [...module.items].sort((a, b) => a.order - b.order);
  return [...module.lessons]
    .sort((a, b) => a.order - b.order)
    .map((lesson) => ({ id: -lesson.id, kind: "lesson", order: lesson.order, lesson, activity: null }));
}

function MoveButtons({ isFirst, isLast, onMove }: { isFirst: boolean; isLast: boolean; onMove: (direction: "up" | "down") => void }) {
  return (
    <div className="flex shrink-0">
      <button type="button" disabled={isFirst} onClick={() => onMove("up")} className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30" aria-label="Mover para cima">
        <ChevronUp className="h-3.5 w-3.5" />
      </button>
      <button type="button" disabled={isLast} onClick={() => onMove("down")} className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30" aria-label="Mover para baixo">
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function RowActions({ onEdit, onDelete, small }: { onEdit: () => void; onDelete: () => void; small?: boolean }) {
  const size = small ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <div className="flex shrink-0">
      <button type="button" onClick={onEdit} className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Editar">
        <Pencil className={size} />
      </button>
      <button type="button" onClick={onDelete} className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive" aria-label="Excluir">
        <Trash2 className={size} />
      </button>
    </div>
  );
}

function CourseModal({ state, onClose, onCreated, onUpdated }: { state: Extract<ModalState, { kind: "course" }>; onClose: () => void; onCreated: (course: AdminCourse) => void; onUpdated: (course: AdminCourse) => void }) {
  const editing = state.mode === "edit" ? state.course : null;
  const [title, setTitle] = useState(editing?.title ?? "");
  const [slug, setSlug] = useState(editing?.slug ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [color, setColor] = useState(editing?.color ?? "#65BE02");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const titleError = submitted && !title.trim() ? "Informe um título." : null;
  const descError = submitted && !description.trim() ? "Informe uma descrição." : null;

  async function submit() {
    setSubmitted(true);
    if (!title.trim() || !description.trim()) return toast.error("Informe título e descrição.");
    setBusy(true);
    try {
      if (editing) {
        const course = await apiFetch<AdminCourse>(`/admin/courses/${editing.id}`, { method: "PATCH", body: JSON.stringify({ title, description, color }) });
        onUpdated(course);
        toast.success("Curso atualizado.");
      } else {
        const course = await apiFetch<AdminCourse>("/admin/courses", { method: "POST", body: JSON.stringify({ title, slug: slug || null, description, color }) });
        onCreated(course);
        toast.success("Curso criado.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? "Editar curso" : "Novo curso"}
      description="Organize trilhas de conteúdo para os alunos."
      icon={Folder}
      footer={<ModalActions busy={busy} onClose={onClose} onSubmit={submit} />}
    >
      <div className="grid gap-3">
        <Field label="Título" required error={titleError}>
          <Input value={title} error={Boolean(titleError)} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Redação nota 1000" />
        </Field>
        {!editing ? (
          <Field label="Slug" hint="Opcional — gerado automaticamente se vazio.">
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="redacao-nota-1000" />
          </Field>
        ) : null}
        <Field label="Descrição" required error={descError}>
          <Textarea value={description} error={Boolean(descError)} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Cor de destaque">
          <div className="flex items-center gap-3">
            <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-11 w-16 cursor-pointer p-1" />
            <span className="text-sm font-medium text-muted-foreground">{color.toUpperCase()}</span>
          </div>
        </Field>
      </div>
    </Modal>
  );
}

function ModuleModal({ state, onClose, onCreated, onUpdated }: { state: Extract<ModalState, { kind: "module" }>; onClose: () => void; onCreated: (courseId: number, module: AdminModule) => void; onUpdated: (course: AdminCourse) => void }) {
  const editing = state.mode === "edit" ? state.module : null;
  const [title, setTitle] = useState(editing?.title ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const titleError = submitted && !title.trim() ? "Informe um título." : null;
  const descError = submitted && !description.trim() ? "Informe uma descrição." : null;

  async function submit() {
    setSubmitted(true);
    if (!title.trim() || !description.trim()) return toast.error("Informe título e descrição.");
    setBusy(true);
    try {
      if (editing) {
        const course = await apiFetch<AdminCourse>(`/admin/modules/${editing.id}`, { method: "PATCH", body: JSON.stringify({ title, description }) });
        onUpdated(course);
        toast.success("Módulo atualizado.");
      } else {
        const createdModule = await apiFetch<AdminModule>(`/admin/courses/${state.courseId}/modules`, { method: "POST", body: JSON.stringify({ title, description }) });
        onCreated(state.courseId, createdModule);
        toast.success("Módulo criado.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? "Editar módulo" : "Novo módulo"}
      description="Agrupe aulas e atividades em uma sequência."
      icon={FolderPlus}
      footer={<ModalActions busy={busy} onClose={onClose} onSubmit={submit} />}
    >
      <div className="grid gap-3">
        <Field label="Título" required error={titleError}>
          <Input value={title} error={Boolean(titleError)} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Descrição" required error={descError}>
          <Textarea value={description} error={Boolean(descError)} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function LessonModal({ state, onClose, onCreated, onUpdated }: { state: Extract<ModalState, { kind: "lesson" }>; onClose: () => void; onCreated: (moduleId: number, lesson: AdminLesson) => void; onUpdated: (course: AdminCourse) => void }) {
  const editing = state.mode === "edit" ? state.lesson : null;
  const [title, setTitle] = useState(editing?.title ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [summary, setSummary] = useState(editing?.summary ?? "");
  const [durationMinutes, setDurationMinutes] = useState(String(editing?.duration_minutes ?? 15));
  const [videoUrl, setVideoUrl] = useState(editing?.video_url ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(editing?.thumbnail_url ?? "");
  const [pdfUrl, setPdfUrl] = useState(editing?.pdf_url ?? "");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const titleError = submitted && !title.trim() ? "Informe um título." : null;
  const descError = submitted && !description.trim() ? "Informe uma descrição." : null;
  const summaryError = submitted && !summary.trim() ? "Informe um resumo." : null;

  async function submit() {
    setSubmitted(true);
    if (!title.trim() || !description.trim() || !summary.trim()) return toast.error("Preencha título, descrição e resumo.");
    setBusy(true);
    const body = { title, description, summary, duration_minutes: Number(durationMinutes), video_url: videoUrl, thumbnail_url: thumbnailUrl, pdf_url: pdfUrl.trim() || null };
    try {
      if (editing) {
        const course = await apiFetch<AdminCourse>(`/admin/lessons/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) });
        onUpdated(course);
        toast.success("Aula atualizada.");
      } else {
        const lesson = await apiFetch<AdminLesson>(`/admin/modules/${state.moduleId}/lessons`, { method: "POST", body: JSON.stringify(body) });
        onCreated(state.moduleId, lesson);
        toast.success("Aula criada.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? "Editar aula" : "Nova aula"}
      description="Conteúdo em vídeo ou texto para o aluno estudar."
      icon={BookOpen}
      size="lg"
      footer={<ModalActions busy={busy} onClose={onClose} onSubmit={submit} />}
    >
      <div className="grid gap-3">
        <Field label="Título" required error={titleError}>
          <Input value={title} error={Boolean(titleError)} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Descrição" required error={descError}>
          <Input value={description} error={Boolean(descError)} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Resumo" required error={summaryError}>
          <Textarea value={summary} error={Boolean(summaryError)} onChange={(e) => setSummary(e.target.value)} className="min-h-24" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Duração (min)">
            <Input type="number" min={1} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
          </Field>
          <Field label="Vídeo URL">
            <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Thumbnail URL">
            <Input value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="https://..." />
          </Field>
          <Field label="PDF (URL)">
            <Input value={pdfUrl} onChange={(e) => setPdfUrl(e.target.value)} placeholder="https://..." />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

function ActivityModal({ state, onClose, onUpdated }: { state: Extract<ModalState, { kind: "activity" }>; onClose: () => void; onUpdated: (course: AdminCourse) => void }) {
  const editing = state.mode === "edit" ? state.activity : null;
  const courseModule = state.module;
  const [draft, setDraft] = useState<AdminActivity>(
    editing ?? {
      id: 0,
      statement: "",
      options: ["", "", "", "", ""],
      correct_answer: "A",
      explanation: "",
      skill: "",
      difficulty: "medium",
      lesson_id: null,
      base_lesson_ids: [],
      order: normalizedItems(courseModule).length + 1,
    },
  );
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const skillError = submitted && !draft.skill.trim() ? "Informe a habilidade." : null;
  const statementError = submitted && draft.statement.trim().length < 20 ? "Mínimo de 20 caracteres." : null;
  const explanationError = submitted && !draft.explanation.trim() ? "Informe a explicação." : null;
  const optionsError = submitted && draft.options.some((option) => !option.trim()) ? "Preencha todas as alternativas." : null;

  async function generateDraft() {
    if (!draft.base_lesson_ids.length) return toast.error("Escolha as aulas que servirão de base para a IA.");
    setGenerating(true);
    try {
      const generated = await apiFetch<AdminActivity[]>(`/admin/modules/${courseModule.id}/activities/generate`, {
        method: "POST",
        body: JSON.stringify({ lesson_ids: draft.base_lesson_ids, difficulty: draft.difficulty, count: 1, focus: draft.skill || null }),
      });
      if (generated[0]) setDraft({ ...generated[0], id: editing?.id ?? 0 });
      toast.success("Atividade gerada. Revise antes de salvar.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar a atividade.");
    } finally {
      setGenerating(false);
    }
  }

  async function submit() {
    setSubmitted(true);
    if (draft.statement.trim().length < 20 || draft.options.some((option) => !option.trim()) || !draft.explanation.trim() || !draft.skill.trim()) {
      toast.error("Revise enunciado, alternativas, explicação e habilidade.");
      return;
    }
    setBusy(true);
    const body = {
      statement: draft.statement,
      options: draft.options,
      correct_answer: draft.correct_answer,
      explanation: draft.explanation,
      skill: draft.skill,
      difficulty: draft.difficulty,
      lesson_id: draft.lesson_id,
      base_lesson_ids: draft.base_lesson_ids,
    };
    try {
      const course = editing
        ? await apiFetch<AdminCourse>(`/admin/activities/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) })
        : await apiFetch<AdminCourse>(`/admin/modules/${courseModule.id}/activities`, { method: "POST", body: JSON.stringify(body) });
      onUpdated(course);
      toast.success(editing ? "Atividade atualizada." : "Atividade criada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? "Editar atividade" : "Nova atividade"}
      description="Questão de múltipla escolha — gere com IA ou monte manualmente."
      icon={ClipboardList}
      size="xl"
      footer={<ModalActions busy={busy} onClose={onClose} onSubmit={submit} />}
    >
      <div className="grid gap-4">
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3.5">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="text-sm font-semibold">Gerar com IA</p>
          </div>
          <Field label="Aulas usadas como base" hint="Selecione ao menos uma aula para a IA se basear.">
            <div className="grid gap-1 rounded-md border bg-card p-2">
              {courseModule.lessons.length ? (
                courseModule.lessons.map((lesson) => {
                  const checked = draft.base_lesson_ids.includes(lesson.id);
                  return (
                    <label
                      key={lesson.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-muted/60",
                        checked && "bg-primary/8 font-medium",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[hsl(var(--primary))]"
                        checked={checked}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            base_lesson_ids: event.target.checked
                              ? [...current.base_lesson_ids, lesson.id]
                              : current.base_lesson_ids.filter((id) => id !== lesson.id),
                            lesson_id: event.target.checked ? lesson.id : current.lesson_id,
                          }))
                        }
                      />
                      {lesson.title}
                    </label>
                  );
                })
              ) : (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">Nenhuma aula neste módulo.</p>
              )}
            </div>
          </Field>
          <Button type="button" size="sm" variant="outline" className="mt-2" onClick={generateDraft} disabled={generating || busy}>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {generating ? "Gerando..." : "Gerar com IA"}
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Habilidade" required error={skillError}>
            <Input value={draft.skill} error={Boolean(skillError)} onChange={(e) => setDraft({ ...draft, skill: e.target.value })} />
          </Field>
          <Field label="Dificuldade">
            <Select value={draft.difficulty} onChange={(e) => setDraft({ ...draft, difficulty: e.target.value as AdminActivity["difficulty"] })}>
              <option value="easy">Essencial</option>
              <option value="medium">Intermediária</option>
              <option value="hard">Avançada</option>
            </Select>
          </Field>
        </div>
        <Field label="Enunciado" required error={statementError} counter={{ value: draft.statement.length, max: 1000 }}>
          <Textarea value={draft.statement} error={Boolean(statementError)} onChange={(e) => setDraft({ ...draft, statement: e.target.value })} className="min-h-24" />
        </Field>
        <Field label="Alternativas" hint="Clique no círculo para marcar a resposta correta." error={optionsError}>
          <div className="grid gap-2">
            {draft.options.map((option, index) => {
              const letter = String.fromCharCode(65 + index) as AdminActivity["correct_answer"];
              const isCorrect = draft.correct_answer === letter;
              return (
                <div key={index} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, correct_answer: letter })}
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
                      isCorrect ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/50",
                    )}
                    title="Marcar como correta"
                    aria-label={`Marcar alternativa ${letter} como correta`}
                  >
                    {letter}
                  </button>
                  <Input
                    value={option}
                    error={Boolean(optionsError) && !option.trim()}
                    onChange={(e) => setDraft({ ...draft, options: draft.options.map((item, current) => (current === index ? e.target.value : item)) })}
                  />
                </div>
              );
            })}
          </div>
        </Field>
        <Field label="Explicação" required error={explanationError}>
          <Textarea value={draft.explanation} error={Boolean(explanationError)} onChange={(e) => setDraft({ ...draft, explanation: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

function ModalActions({ busy, onClose, onSubmit }: { busy: boolean; onClose: () => void; onSubmit: () => void }) {
  return (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button>
      <Button type="button" onClick={onSubmit} disabled={busy}>Salvar</Button>
    </div>
  );
}
