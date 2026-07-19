"use client";

import { useState } from "react";
import { Edit2, FileText, Plus, Save, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/services/api";
import type { EssayTheme, SupportingText } from "@/types/api";

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

function draftFromTheme(theme: EssayTheme): ThemeDraft {
  return {
    title: theme.title,
    context: theme.context,
    supporting_texts: theme.supporting_texts?.length
      ? theme.supporting_texts
      : [{ title: "Texto motivador I", content: "Descreva aqui o texto de apoio que será apresentado ao estudante.", type: "motivador" }],
  };
}

export function ThemesTab({
  themes,
  onGenerated,
  onUpdated,
  onDeleted,
}: {
  themes: EssayTheme[];
  onGenerated: (theme: EssayTheme) => void;
  onUpdated: (theme: EssayTheme) => void;
  onDeleted: (themeId: number) => void;
}) {
  const [focus, setFocus] = useState("");
  const [requirements, setRequirements] = useState<Record<TextType, number>>({
    motivador: 3,
    dados: 0,
    repertorio: 0,
    imagem: 0,
    grafico: 0,
    infografico: 0,
    postagem: 0,
    manchete: 0,
    tirinha: 0,
    charge: 0,
  });
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<ThemeDraft | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function generateTheme() {
    if (generating) return;
    const selected = Object.entries(requirements)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => ({ type, count }));
    if (!selected.length) {
      toast.error("Escolha pelo menos um tipo de texto motivador.");
      return;
    }
    setGenerating(true);
    try {
      const theme = await apiFetch<EssayTheme>("/admin/essay-themes/generate", {
        method: "POST",
        body: JSON.stringify({ focus: focus.trim() || null, supporting_text_requirements: selected }),
      });
      onGenerated(theme);
      setFocus("");
      toast.success("Tema gerado para revisão.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar o tema.");
    } finally {
      setGenerating(false);
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

  function validateDraft(current: ThemeDraft) {
    if (current.title.trim().length < 8) return "O título precisa ter pelo menos 8 caracteres.";
    if (current.context.trim().length < 20) return "O contexto precisa explicar a proposta com mais detalhe.";
    if (!current.supporting_texts.length) return "Adicione pelo menos um texto motivador.";
    const invalid = current.supporting_texts.find((text) => text.title.trim().length < 4 || text.content.trim().length < 40);
    if (invalid) return "Cada texto motivador precisa ter título e pelo menos 40 caracteres.";
    return "";
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
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="rounded-card bg-card shadow-soft">
        <div className="border-b px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Banco de temas</Badge>
            <Badge variant="outline">{themes.length} ativos</Badge>
          </div>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2">
          {themes.map((theme) => {
            const isEditing = editingId === theme.id;
            const isBusy = busyId === theme.id;
            return (
              <article key={theme.id} className={isEditing ? "rounded-card bg-card p-4 shadow-soft ring-1 ring-primary/30" : "game-tile bg-card p-4"}>
                {isEditing && draft ? (
                  <ThemeEditor
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
                        <h3 className="text-safe text-sm font-semibold leading-5">{theme.title}</h3>
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
                  </>
                )}
              </article>
            );
          })}
          {!themes.length ? <p className="text-sm text-muted-foreground">Nenhum tema ativo cadastrado ainda. Gere um tema novo acima.</p> : null}
        </div>
      </div>

      <div className="rounded-card bg-card p-4 shadow-soft">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
          <h3 className="text-sm font-semibold">Gerar tema com IA</h3>
        </div>
        <div className="grid gap-3">
          <Field label="Foco opcional" counter={{ value: focus.length, max: 160 }}>
            <Input value={focus} maxLength={160} placeholder="Ex.: tecnologia, saúde pública" onChange={(event) => setFocus(event.target.value)} />
          </Field>
          <div className="grid gap-2">
            <p className="text-xs font-semibold text-muted-foreground">Textos de apoio</p>
            {TEXT_TYPES.map((item) => (
              <label key={item.value} className="flex items-center justify-between gap-3 rounded-control bg-background/50 px-3 py-2 text-xs shadow-soft">
                <span className="font-medium">{item.label}</span>
                <Input
                  type="number"
                  min={0}
                  max={5}
                  value={requirements[item.value]}
                  onChange={(event) => setRequirements((current) => ({ ...current, [item.value]: Number(event.target.value) }))}
                  className="h-8 w-20"
                />
              </label>
            ))}
          </div>
          <Button type="button" onClick={generateTheme} disabled={generating}>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {generating ? "Gerando..." : "Gerar tema"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ThemeEditor({
  draft,
  busy,
  onChange,
  onCancel,
  onSave,
}: {
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
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-muted-foreground">Textos motivadores</p>
          <Button type="button" size="sm" variant="outline" onClick={addText} disabled={busy || draft.supporting_texts.length >= 8}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Adicionar
          </Button>
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

function labelForType(type: TextType) {
  return TEXT_TYPES.find((item) => item.value === type)?.label ?? "Texto";
}
