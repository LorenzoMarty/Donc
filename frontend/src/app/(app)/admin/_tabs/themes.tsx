"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Edit2, FileText, Save, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/services/api";
import type { EssayTheme } from "@/types/api";

type ThemeDraft = {
  title: string;
  context: string;
  source: string;
};

function draftFromTheme(theme: EssayTheme): ThemeDraft {
  return {
    title: theme.title,
    context: theme.context,
    source: theme.source,
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
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<ThemeDraft | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function generateTheme() {
    if (generating) return;
    setGenerating(true);
    try {
      const theme = await apiFetch<EssayTheme>("/admin/essay-themes/generate", {
        method: "POST",
        body: JSON.stringify({ focus: focus.trim() || null }),
      });
      onGenerated(theme);
      setFocus("");
      toast.success("Tema gerado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nao foi possivel gerar o tema.");
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

  async function saveTheme(theme: EssayTheme) {
    if (!draft || busyId) return;
    setBusyId(theme.id);
    try {
      const updated = await apiFetch<EssayTheme>(`/admin/essay-themes/${theme.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: draft.title,
          context: draft.context,
          source: draft.source,
        }),
      });
      onUpdated(updated);
      cancelEditing();
      toast.success("Tema atualizado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nao foi possivel atualizar o tema.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteTheme(theme: EssayTheme) {
    if (busyId) return;
    if (!window.confirm(`Excluir o tema "${theme.title}"? Ele deixara de aparecer para os alunos.`)) return;
    setBusyId(theme.id);
    try {
      await apiFetch<{ action: "deleted"; theme_id: number }>(`/admin/essay-themes/${theme.id}`, { method: "DELETE" });
      onDeleted(theme.id);
      if (editingId === theme.id) cancelEditing();
      toast.success("Tema excluido.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nao foi possivel excluir o tema.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="rounded-lg border bg-card">
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
              <article key={theme.id} className="rounded-md border border-border bg-background/40 p-4">
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
                        <p className="mt-1 text-xs font-semibold text-muted-foreground">{theme.source}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          disabled={Boolean(busyId)}
                          onClick={() => startEditing(theme)}
                          aria-label="Editar tema"
                        >
                          <Edit2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          disabled={Boolean(busyId)}
                          onClick={() => deleteTheme(theme)}
                          aria-label="Excluir tema"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-safe line-clamp-4 text-xs leading-5 text-muted-foreground">{theme.context}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(theme.supporting_texts ?? []).slice(0, 3).map((text) => (
                        <Badge key={`${theme.id}-${text.title}`} variant="outline" className="max-w-full truncate text-[11px]">
                          {text.title}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}
              </article>
            );
          })}
          {!themes.length ? <p className="text-sm text-muted-foreground">Nenhum tema ativo cadastrado.</p> : null}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
          <h3 className="text-sm font-semibold">Gerar tema</h3>
        </div>
        <div className="grid gap-3">
          <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
            Foco opcional
            <Input
              value={focus}
              maxLength={160}
              placeholder="Ex.: tecnologia, saude publica"
              onChange={(event) => setFocus(event.target.value)}
            />
          </label>
          <Button type="button" onClick={generateTheme} disabled={generating}>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {generating ? "Gerando..." : "Gerar um tema"}
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
  return (
    <div className="grid gap-3">
      <Field label="Titulo">
        <Input value={draft.title} maxLength={220} onChange={(event) => onChange({ ...draft, title: event.target.value })} disabled={busy} />
      </Field>
      <Field label="Fonte">
        <Input value={draft.source} maxLength={160} onChange={(event) => onChange({ ...draft, source: event.target.value })} disabled={busy} />
      </Field>
      <Field label="Contexto">
        <textarea
          value={draft.context}
          maxLength={5000}
          onChange={(event) => onChange({ ...draft, context: event.target.value })}
          disabled={busy}
          rows={6}
          className="min-h-[9rem] w-full resize-y rounded-md border bg-background px-3 py-2 text-sm leading-6 outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
        />
      </Field>
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
      {label}
      {children}
    </label>
  );
}
