"use client";

import { useState } from "react";
import { Edit2, FilePlus2, FileText, Plus, Save, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { GenerateWithAiButton } from "@/app/(app)/admin/_tabs/components/generate-with-ai-button";
import { HistoryPanel } from "@/app/(app)/admin/_tabs/components/history-panel";
import {
  MAX_SUPPORTING_TEXTS_PER_THEME,
  SupportingTextTypePicker,
  requirementsToPayload,
  type SupportingTextType,
} from "@/app/(app)/admin/_tabs/components/supporting-text-type-picker";
import { ThemeGeneratorForm } from "@/app/(app)/admin/_tabs/create-with-ai";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/services/api";
import type { AdminUser, EssayTheme, SupportingText } from "@/types/api";

type TextType = SupportingText["type"];

type ThemeDraft = {
  title: string;
  context: string;
  supporting_texts: SupportingText[];
};

const TEXT_TYPES: { value: TextType; label: string }[] = [
  { value: "motivador", label: "Texto motivador" },
  { value: "dados", label: "Dados" },
  { value: "repertorio", label: "Repertório" },
  { value: "imagem", label: "Imagem ou descrição visual" },
  { value: "grafico", label: "Gráfico" },
  { value: "infografico", label: "Infográfico" },
  { value: "postagem", label: "Postagem (rede social)" },
  { value: "manchete", label: "Manchete" },
  { value: "tirinha", label: "Tirinha (IA gera imagem)" },
  { value: "charge", label: "Charge (IA gera imagem)" },
];

function validateDraft(current: ThemeDraft) {
  if (current.title.trim().length < 8) return "O título precisa ter pelo menos 8 caracteres.";
  if (current.context.trim().length < 20) return "O contexto precisa explicar a proposta com mais detalhe.";
  if (!current.supporting_texts.length) return "Adicione pelo menos um texto motivador.";
  const invalid = current.supporting_texts.find((text) => text.title.trim().length < 4 || text.content.trim().length < 40);
  if (invalid) return "Cada texto motivador precisa ter título e pelo menos 40 caracteres.";
  return "";
}

function draftFromTheme(theme: EssayTheme): ThemeDraft {
  return {
    title: theme.title,
    context: theme.context,
    supporting_texts: theme.supporting_texts?.length
      ? theme.supporting_texts
      : [{ title: "Texto motivador I", content: "Descreva aqui o texto de apoio que será apresentado ao estudante.", type: "motivador" }],
  };
}

function themeStatusBadge(status: EssayTheme["status"]) {
  if (status === "pending") return <Badge variant="outline" className="text-xs">Pendente</Badge>;
  if (status === "rejected") return <Badge variant="destructive" className="text-xs">Rejeitado</Badge>;
  return null;
}

export function ThemesTab({
  themes,
  users,
  onUpdated,
  onDeleted,
  onGenerated,
}: {
  themes: EssayTheme[];
  users: AdminUser[];
  onUpdated: (theme: EssayTheme) => void;
  onDeleted: (themeId: number) => void;
  onGenerated: (theme: EssayTheme) => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<ThemeDraft | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const filteredThemes = query ? themes.filter((t) => t.title.toLowerCase().includes(query.toLowerCase())) : themes;

  async function reviewTheme(theme: EssayTheme, action: "approve" | "reject") {
    if (busyId) return;
    setBusyId(theme.id);
    try {
      const updated = await apiFetch<EssayTheme>(`/admin/essay-themes/${theme.id}/review`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      onUpdated(updated);
      toast.success(action === "approve" ? "Tema aprovado." : "Tema rejeitado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível revisar o tema.");
    } finally {
      setBusyId(null);
    }
  }

  function startEditing(theme: EssayTheme) {
    setEditingId(theme.id);
    setDraft(draftFromTheme(theme));
  }

  function cancelEditing() {
    setEditingId(null);
    setDraft(null);
  }

  async function saveTheme(theme: EssayTheme) {
    if (!draft || busyId) return;
    const validation = validateDraft(draft);
    if (validation) {
      toast.error(validation);
      return;
    }
    setBusyId(theme.id);
    try {
      const updated = await apiFetch<EssayTheme>(`/admin/essay-themes/${theme.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: draft.title,
          context: draft.context,
          supporting_texts: draft.supporting_texts,
        }),
      });
      onUpdated(updated);
      cancelEditing();
      toast.success("Tema atualizado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível atualizar o tema.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteTheme(theme: EssayTheme) {
    if (busyId) return;
    if (!window.confirm(`Excluir o tema "${theme.title}"? Ele deixará de aparecer para os alunos.`)) return;
    setBusyId(theme.id);
    try {
      await apiFetch<{ action: "deleted"; theme_id: number }>(`/admin/essay-themes/${theme.id}`, { method: "DELETE" });
      onDeleted(theme.id);
      if (editingId === theme.id) cancelEditing();
      toast.success("Tema excluído.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir o tema.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-card bg-card shadow-soft">
      <div className="border-b px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar tema..." className="pl-9" />
          </div>
          <Badge variant="outline">{themes.length} temas</Badge>
          <CreateThemeButton onCreated={onGenerated} />
          <GenerateWithAiButton
            label="Gerar tema com IA"
            title="Gerar tema com IA"
            description="Gera um tema com textos motivadores — nasce pendente de revisão."
          >
            {(close) => (
              <ThemeGeneratorForm
                onGenerated={(theme) => {
                  onGenerated(theme);
                  close();
                }}
              />
            )}
          </GenerateWithAiButton>
        </div>
      </div>
      <div className="grid gap-3 p-4 md:grid-cols-2">
        {filteredThemes.map((theme) => {
          const isEditing = editingId === theme.id;
          const isBusy = busyId === theme.id;
          return (
            <article key={theme.id} className={isEditing ? "rounded-card bg-card p-4 shadow-soft ring-1 ring-primary/30" : "game-tile bg-background/60 p-4"}>
              {isEditing && draft ? (
                <ThemeEditor
                  themeId={theme.id}
                  draft={draft}
                  busy={isBusy}
                  onChange={setDraft}
                  onCancel={cancelEditing}
                  onSave={() => saveTheme(theme)}
                />
              ) : (
                <>
                  <div className="mb-3 flex items-start gap-3">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {themeStatusBadge(theme.status)}
                        <h3 className="text-safe text-sm font-semibold leading-5">{theme.title}</h3>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{theme.supporting_texts?.length ?? 0} textos de apoio</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={Boolean(busyId)} onClick={() => startEditing(theme)} aria-label="Editar tema">
                        <Edit2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" disabled={Boolean(busyId)} onClick={() => deleteTheme(theme)} aria-label="Excluir tema">
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-safe line-clamp-4 text-xs leading-5 text-muted-foreground">{theme.context}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(theme.supporting_texts ?? []).slice(0, 4).map((text) => (
                      <Badge key={`${theme.id}-${text.title}`} variant="outline" className="max-w-full truncate text-[11px]">
                        {labelForType(text.type)}
                      </Badge>
                    ))}
                  </div>
                  {theme.status === "pending" && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="button" size="sm" disabled={isBusy} onClick={() => reviewTheme(theme, "approve")}>
                        Aprovar
                      </Button>
                      <Button type="button" size="sm" variant="outline" disabled={isBusy} onClick={() => reviewTheme(theme, "reject")}>
                        Rejeitar
                      </Button>
                    </div>
                  )}
                  <div className="mt-3">
                    <HistoryPanel contentType="EssayTheme" contentId={theme.id} users={users} />
                  </div>
                </>
              )}
            </article>
          );
        })}
        {!filteredThemes.length ? (
          <p className="text-sm text-muted-foreground">
            {themes.length ? "Nenhum tema encontrado com essa busca." : 'Nenhum tema cadastrado ainda. Use "Gerar tema com IA" para criar um.'}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ThemeEditor({
  themeId,
  draft,
  busy,
  onChange,
  onCancel,
  onSave,
}: {
  themeId: number | null;
  draft: ThemeDraft;
  busy: boolean;
  onChange: (draft: ThemeDraft) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  function updateText(index: number, patch: Partial<SupportingText>) {
    onChange({
      ...draft,
      supporting_texts: draft.supporting_texts.map((text, currentIndex) => (currentIndex === index ? { ...text, ...patch } : text)),
    });
  }

  function removeText(index: number) {
    onChange({ ...draft, supporting_texts: draft.supporting_texts.filter((_, currentIndex) => currentIndex !== index) });
  }

  function addText() {
    onChange({
      ...draft,
      supporting_texts: [...draft.supporting_texts, { title: "Novo texto motivador", content: "", type: "motivador" }],
    });
  }

  return (
    <div className="grid gap-3">
      <Field label="Título" counter={{ value: draft.title.length, max: 220 }}>
        <Input value={draft.title} maxLength={220} onChange={(event) => onChange({ ...draft, title: event.target.value })} disabled={busy} />
      </Field>
      <Field label="Contexto" counter={{ value: draft.context.length, max: 5000 }}>
        <Textarea value={draft.context} maxLength={5000} onChange={(event) => onChange({ ...draft, context: event.target.value })} disabled={busy} rows={5} />
      </Field>
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold text-muted-foreground">Textos motivadores</p>
          <div className="flex gap-2">
            {themeId ? (
              <RegenerateSupportingTextsButton
                themeId={themeId}
                busy={busy}
                onGenerated={(supportingTexts) => onChange({ ...draft, supporting_texts: supportingTexts })}
              />
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addText}
              disabled={busy || draft.supporting_texts.length >= MAX_SUPPORTING_TEXTS_PER_THEME}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Adicionar
            </Button>
          </div>
        </div>
        {draft.supporting_texts.map((text, index) => (
          <div key={`${text.title}-${index}`} className="grid gap-2 rounded-control bg-background/50 p-3 shadow-soft">
            <div className="flex items-center gap-2">
              <Select
                value={text.type}
                disabled={busy}
                onChange={(event) => updateText(index, { type: event.target.value as TextType })}
                className="h-9 text-xs"
              >
                {TEXT_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
              <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-destructive" onClick={() => removeText(index)} disabled={busy || draft.supporting_texts.length === 1} aria-label="Remover texto">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            <Field counter={{ value: text.title.length, max: 120 }}>
              <Input value={text.title} maxLength={120} onChange={(event) => updateText(index, { title: event.target.value })} disabled={busy} placeholder="Título do texto de apoio" />
            </Field>
            <Field counter={{ value: text.content.length, max: 1200 }}>
              <Textarea value={text.content} maxLength={1200} onChange={(event) => updateText(index, { content: event.target.value })} disabled={busy} rows={4} placeholder="Conteúdo do texto de apoio" />
            </Field>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={onSave} disabled={busy}>
          <Save className="h-4 w-4" aria-hidden="true" />
          Salvar
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={busy}>
          <X className="h-4 w-4" aria-hidden="true" />
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function CreateThemeButton({ onCreated }: { onCreated: (theme: EssayTheme) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ThemeDraft>({
    title: "",
    context: "",
    supporting_texts: [{ title: "", content: "", type: "motivador" }],
  });
  const [saving, setSaving] = useState(false);

  function close() {
    setOpen(false);
    setDraft({ title: "", context: "", supporting_texts: [{ title: "", content: "", type: "motivador" }] });
  }

  async function create() {
    const validation = validateDraft(draft);
    if (validation) {
      toast.error(validation);
      return;
    }
    setSaving(true);
    try {
      const created = await apiFetch<EssayTheme>("/admin/essay-themes", {
        method: "POST",
        body: JSON.stringify(draft),
      });
      onCreated(created);
      close();
      toast.success("Tema criado — aguardando revisão.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível criar o tema.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        <FilePlus2 className="h-3.5 w-3.5" aria-hidden="true" />
        Criar tema
      </Button>
      <Modal open={open} onClose={close} title="Criar tema" description="Tema nasce pendente de revisão — aprove depois na lista.">
        <ThemeEditor themeId={null} draft={draft} busy={saving} onChange={setDraft} onCancel={close} onSave={create} />
      </Modal>
    </>
  );
}

function labelForType(type: TextType) {
  return TEXT_TYPES.find((item) => item.value === type)?.label ?? "Texto";
}

function RegenerateSupportingTextsButton({
  themeId,
  busy,
  onGenerated,
}: {
  themeId: number;
  busy: boolean;
  onGenerated: (supportingTexts: SupportingText[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [quantities, setQuantities] = useState<Partial<Record<SupportingTextType, number>>>({});
  const [generating, setGenerating] = useState(false);

  async function generate() {
    setGenerating(true);
    try {
      const supportingTexts = await apiFetch<SupportingText[]>(`/admin/essay-themes/${themeId}/supporting-texts/generate`, {
        method: "POST",
        body: JSON.stringify({ supporting_text_requirements: requirementsToPayload(quantities) }),
      });
      onGenerated(supportingTexts);
      setOpen(false);
      setQuantities({});
      toast.success("Textos motivadores gerados — revise antes de salvar.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar textos motivadores.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setOpen(true)}>
        Gerar com IA
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Gerar textos motivadores com IA"
        description="Substitui todos os textos motivadores atuais do tema pelo lote gerado — revise antes de salvar."
      >
        <div className="grid gap-3">
          <SupportingTextTypePicker quantities={quantities} onChange={setQuantities} disabled={generating} />
          <Button onClick={generate} disabled={generating}>
            {generating ? "Gerando..." : "Gerar e substituir"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
