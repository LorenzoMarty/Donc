"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, ChevronUp, ClipboardList, Folder, FolderPlus, Pencil, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { GenerateWithAiButton } from "@/app/(app)/admin/_tabs/components/generate-with-ai-button";
import { TargetsField } from "@/app/(app)/admin/_tabs/components/targets-field";
import { ExerciseGeneratorForm } from "@/app/(app)/admin/_tabs/create-with-ai";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils";
import { apiFetch } from "@/services/api";
import type { AdminActivity, AdminLesson, AdminModule, AdminModuleItem } from "@/types/api";

export type ModalState =
  | { kind: "module"; mode: "create" }
  | { kind: "module"; mode: "edit"; module: AdminModule }
  | { kind: "lesson"; mode: "create"; moduleId: number }
  | { kind: "lesson"; mode: "edit"; moduleId: number; lesson: AdminLesson }
  | { kind: "activity"; mode: "create"; module: AdminModule }
  | { kind: "activity"; mode: "edit"; module: AdminModule; activity: AdminActivity }
  | null;

export function ModulesTab({
  modules,
  onModulesChanged,
  onLessonCreated,
}: {
  modules: AdminModule[];
  onModulesChanged: (modules: AdminModule[]) => void;
  onLessonCreated: (moduleId: number, lesson: AdminLesson) => void;
}) {
  const [modal, setModal] = useState<ModalState>(null);
  const [query, setQuery] = useState("");

  async function moveModule(moduleId: number, direction: "up" | "down") {
    try {
      const updated = await apiFetch<AdminModule[]>(`/admin/modules/${moduleId}/move`, { method: "POST", body: JSON.stringify({ direction }) });
      onModulesChanged(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível reordenar.");
    }
  }

  async function moveItem(item: AdminModuleItem, direction: "up" | "down") {
    try {
      const endpoint = item.id > 0 ? `/admin/module-items/${item.id}/move` : `/admin/lessons/${item.lesson?.id}/move`;
      const updated = await apiFetch<AdminModule[]>(endpoint, { method: "POST", body: JSON.stringify({ direction }) });
      onModulesChanged(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível reordenar.");
    }
  }

  async function deleteModule(module: AdminModule) {
    if (!window.confirm(`Excluir o módulo "${module.title}" e suas aulas?`)) return;
    try {
      const updated = await apiFetch<AdminModule[]>(`/admin/modules/${module.id}`, { method: "DELETE" });
      onModulesChanged(updated);
      toast.success("Módulo excluído.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir o módulo.");
    }
  }

  async function deleteLesson(lesson: AdminLesson) {
    if (!window.confirm(`Excluir a aula "${lesson.title}"?`)) return;
    try {
      const updated = await apiFetch<AdminModule[]>(`/admin/lessons/${lesson.id}`, { method: "DELETE" });
      onModulesChanged(updated);
      toast.success("Aula excluída.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir a aula.");
    }
  }

  async function deleteActivity(activity: AdminActivity) {
    if (!window.confirm("Excluir esta atividade?")) return;
    try {
      const updated = await apiFetch<AdminModule[]>(`/admin/activities/${activity.id}`, { method: "DELETE" });
      onModulesChanged(updated);
      toast.success("Atividade excluída.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir a atividade.");
    }
  }

  const sortedModules = [...modules].sort((a, b) => a.order - b.order);
  const filteredModules = query
    ? sortedModules.filter((m) => m.title.toLowerCase().includes(query.toLowerCase()))
    : sortedModules;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar módulo..." className="pl-9" />
        </div>
        <Badge variant="outline">{modules.length} módulos</Badge>
        <GenerateWithAiButton
          label="Gerar exercício com IA"
          title="Gerar exercício com IA"
          description="Escolha o módulo e as aulas base — o exercício nasce pendente de revisão."
        >
          {(close) => (
            <ExerciseGeneratorForm modules={modules} onGenerated={() => close()} />
          )}
        </GenerateWithAiButton>
        <Button type="button" size="sm" onClick={() => setModal({ kind: "module", mode: "create" })}>
          <FolderPlus className="h-4 w-4" aria-hidden="true" />
          Novo módulo
        </Button>
      </div>

      <div className="grid gap-3">
        {filteredModules.map((module) => (
          <ModuleNode
            key={module.id}
            module={module}
            isFirst={module.order === sortedModules[0]?.order}
            isLast={module.order === sortedModules[sortedModules.length - 1]?.order}
            onEdit={() => setModal({ kind: "module", mode: "edit", module })}
            onDelete={() => deleteModule(module)}
            onMove={(direction) => moveModule(module.id, direction)}
            onAddLesson={() => setModal({ kind: "lesson", mode: "create", moduleId: module.id })}
            onEditLesson={(lesson) => setModal({ kind: "lesson", mode: "edit", moduleId: module.id, lesson })}
            onDeleteLesson={deleteLesson}
            onAddActivity={() => setModal({ kind: "activity", mode: "create", module })}
            onEditActivity={(activity) => setModal({ kind: "activity", mode: "edit", module, activity })}
            onDeleteActivity={deleteActivity}
            onMoveItem={moveItem}
          />
        ))}
        {!filteredModules.length ? (
          <p className="rounded-card bg-card p-6 text-sm text-muted-foreground shadow-soft">
            {modules.length ? "Nenhum módulo encontrado com essa busca." : "Nenhum módulo cadastrado ainda. Crie o primeiro acima pra liberar aulas e atividades."}
          </p>
        ) : null}
      </div>

      {modal?.kind === "module" ? (
        <ModuleModal
          state={modal}
          onClose={() => setModal(null)}
          onSaved={(updated) => {
            onModulesChanged(updated);
            setModal(null);
          }}
        />
      ) : null}
      {modal?.kind === "lesson" ? (
        <LessonModal state={modal} onClose={() => setModal(null)} onCreated={(moduleId, lesson) => { onLessonCreated(moduleId, lesson); setModal(null); }} onUpdated={(updated) => { onModulesChanged(updated); setModal(null); }} />
      ) : null}
      {modal?.kind === "activity" ? (
        <ActivityModal state={modal} onClose={() => setModal(null)} onUpdated={(updated) => { onModulesChanged(updated); setModal(null); }} />
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
  const [open, setOpen] = useState(true);
  const items = normalizedItems(module);

  return (
    <div className="game-tile bg-card">
      <div className="flex items-start gap-3 border-b px-4 py-3">
        <button type="button" onClick={() => setOpen((v) => !v)} className="mt-0.5 text-muted-foreground transition-transform hover:text-foreground" aria-label="Expandir módulo">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <Folder className="mt-0.5 h-5 w-5 shrink-0" style={{ color: module.color }} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{module.order}. {module.title}</p>
          <p className="text-xs text-muted-foreground">{module.slug} · {items.length} itens na sequência</p>
        </div>
        <MoveButtons isFirst={isFirst} isLast={isLast} onMove={onMove} />
        <RowActions onEdit={onEdit} onDelete={onDelete} />
      </div>

      {open ? (
        <div className="collapse-in grid gap-1 p-3 pl-9">
          {items.map((item, index) => (
            <div key={`${item.kind}-${item.id}`} className="flex items-center gap-2 rounded-control px-1 py-1 hover:bg-muted/50">
              {item.kind === "lesson" ? <BookOpen className="h-3.5 w-3.5 shrink-0 text-primary" /> : <ClipboardList className="h-3.5 w-3.5 shrink-0 text-streak" />}
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
      ) : null}
    </div>
  );
}

export function normalizedItems(module: AdminModule): AdminModuleItem[] {
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

function ModuleModal({
  state,
  onClose,
  onSaved,
}: {
  state: Extract<ModalState, { kind: "module" }>;
  onClose: () => void;
  onSaved: (modules: AdminModule[]) => void;
}) {
  const editing = state.mode === "edit" ? state.module : null;
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
        const modules = await apiFetch<AdminModule[]>(`/admin/modules/${editing.id}`, { method: "PATCH", body: JSON.stringify({ title, description, color }) });
        onSaved(modules);
        toast.success("Módulo atualizado.");
      } else {
        const modules = await apiFetch<AdminModule[]>("/admin/modules", { method: "POST", body: JSON.stringify({ title, slug: slug || null, description, color }) });
        onSaved(modules);
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
      description="Módulos agrupam aulas e atividades em uma sequência — são a unidade que o aluno navega no catálogo."
      icon={FolderPlus}
      footer={<ModalActions busy={busy} onClose={onClose} onSubmit={submit} />}
    >
      <div className="grid gap-3">
        <Field label="Título" required error={titleError}>
          <Input value={title} error={Boolean(titleError)} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Fundamentos da Redação" />
        </Field>
        {!editing ? (
          <Field label="Slug" hint="Opcional — gerado automaticamente se vazio.">
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="fundamentos-da-redacao" />
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

function LessonModal({ state, onClose, onCreated, onUpdated }: { state: Extract<ModalState, { kind: "lesson" }>; onClose: () => void; onCreated: (moduleId: number, lesson: AdminLesson) => void; onUpdated: (modules: AdminModule[]) => void }) {
  const editing = state.mode === "edit" ? state.lesson : null;
  const [title, setTitle] = useState(editing?.title ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [summary, setSummary] = useState(editing?.summary ?? "");
  const [durationMinutes, setDurationMinutes] = useState(String(editing?.duration_minutes ?? 15));
  const [videoUrl, setVideoUrl] = useState(editing?.video_url ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(editing?.thumbnail_url ?? "");
  const [pdfUrl, setPdfUrl] = useState(editing?.pdf_url ?? "");
  const [targets, setTargets] = useState<string[]>(editing?.targets ?? []);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const titleError = submitted && !title.trim() ? "Informe um título." : null;
  const descError = submitted && !description.trim() ? "Informe uma descrição." : null;
  const summaryError = submitted && !summary.trim() ? "Informe um resumo." : null;

  async function submit() {
    setSubmitted(true);
    if (!title.trim() || !description.trim() || !summary.trim()) return toast.error("Preencha título, descrição e resumo.");
    setBusy(true);
    const body = { title, description, summary, duration_minutes: Number(durationMinutes), video_url: videoUrl, thumbnail_url: thumbnailUrl, pdf_url: pdfUrl.trim() || null, targets };
    try {
      if (editing) {
        const modules = await apiFetch<AdminModule[]>(`/admin/lessons/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) });
        onUpdated(modules);
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
        <TargetsField value={targets} onChange={setTargets} hint="Usado pelo motor de recomendação para indicar esta aula ao aluno certo." />
      </div>
    </Modal>
  );
}

export function ActivityModal({ state, onClose, onUpdated }: { state: Extract<ModalState, { kind: "activity" }>; onClose: () => void; onUpdated: (modules: AdminModule[]) => void }) {
  const editing = state.mode === "edit" ? state.activity : null;
  const contentModule = state.module;
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
      order: normalizedItems(contentModule).length + 1,
      targets: [],
    },
  );
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const skillError = submitted && !draft.skill.trim() ? "Informe a habilidade." : null;
  const statementError = submitted && draft.statement.trim().length < 20 ? "Mínimo de 20 caracteres." : null;
  const explanationError = submitted && !draft.explanation.trim() ? "Informe a explicação." : null;
  const optionsError = submitted && draft.options.some((option) => !option.trim()) ? "Preencha todas as alternativas." : null;

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
      targets: draft.targets,
    };
    try {
      const modules = editing
        ? await apiFetch<AdminModule[]>(`/admin/activities/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) })
        : await apiFetch<AdminModule[]>(`/admin/modules/${contentModule.id}/activities`, { method: "POST", body: JSON.stringify(body) });
      onUpdated(modules);
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
      description="Questão de múltipla escolha — monte manualmente ou gere um rascunho na aba Criar com IA."
      icon={ClipboardList}
      size="xl"
      footer={<ModalActions busy={busy} onClose={onClose} onSubmit={submit} />}
    >
      <div className="grid gap-4">
        <div className="rounded-card bg-primary/5 p-3.5 shadow-soft">
          <Field label="Aulas base" hint="Aulas que esta atividade cobra do aluno.">
            <div className="grid gap-1 rounded-control bg-card p-2 shadow-soft">
              {contentModule.lessons.length ? (
                contentModule.lessons.map((lesson) => {
                  const checked = draft.base_lesson_ids.includes(lesson.id);
                  return (
                    <label
                      key={lesson.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-xs transition-colors hover:bg-muted/60",
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
                <p className="px-2 py-1.5 text-xs text-muted-foreground">Nenhuma aula neste módulo ainda.</p>
              )}
            </div>
          </Field>
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
        <TargetsField
          value={draft.targets}
          onChange={(next) => setDraft({ ...draft, targets: next })}
          hint="Usado pelo motor de recomendação para indicar esta atividade ao aluno certo."
        />
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
