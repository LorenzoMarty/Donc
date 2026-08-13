"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Eye, Loader2, Plus, Save, Trash2, Wand2, X } from "lucide-react";
import { toast } from "sonner";

import { TargetsField } from "@/app/(app)/admin/_tabs/components/targets-field";
import { GamePreviewModal } from "@/app/(app)/admin/_tabs/game-preview";
import { HistoryPanel } from "@/app/(app)/admin/_tabs/components/history-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/http-client";
import type { AdminUser, AIGeneratedGame, GameQuestion } from "@/types/api";
import { cn } from "@/utils";

function statusBadge(status: string) {
  if (status === "approved") return <Badge variant="success" className="text-xs">Aprovado</Badge>;
  if (status === "rejected") return <Badge variant="destructive" className="text-xs">Rejeitado</Badge>;
  return <Badge variant="outline" className="text-xs">Pendente</Badge>;
}

function GameCard({
  game,
  users,
  onReviewed,
  onDeleted,
}: {
  game: AIGeneratedGame;
  users: AdminUser[];
  onReviewed: (updated: AIGeneratedGame) => void;
  onDeleted: (gameId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editingQ, setEditingQ] = useState<GameQuestion[] | null>(null);
  const [notes, setNotes] = useState("");
  const [targets, setTargets] = useState<string[]>(game.targets);
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [structuralBusy, setStructuralBusy] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const questions = editingQ ?? game.questions;

  function guardUnsavedEdits(): boolean {
    if (editingQ) {
      toast.error("Salve ou descarte as alterações de texto antes de adicionar/remover/reordenar/regenerar.");
      return false;
    }
    return true;
  }

  async function addQuestion() {
    if (!guardUnsavedEdits()) return;
    setStructuralBusy("add");
    try {
      const result = await apiFetch<AIGeneratedGame>(`/admin/ai-games/${game.id}/questions`, {
        method: "POST",
        body: JSON.stringify({ prompt: "Nova pergunta — edite o enunciado.", options: ["Alternativa 1", "Alternativa 2"], answer_index: 0, explanation: "Edite a explicação." }),
      });
      onReviewed(result);
      toast.success("Pergunta adicionada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar pergunta.");
    } finally {
      setStructuralBusy(null);
    }
  }

  async function removeQuestion(questionId: string) {
    if (!guardUnsavedEdits()) return;
    if (!window.confirm("Remover esta pergunta do jogo?")) return;
    setStructuralBusy(questionId);
    try {
      const result = await apiFetch<AIGeneratedGame>(`/admin/ai-games/${game.id}/questions/${questionId}`, { method: "DELETE" });
      onReviewed(result);
      toast.success("Pergunta removida.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover pergunta.");
    } finally {
      setStructuralBusy(null);
    }
  }

  async function moveQuestion(index: number, direction: -1 | 1) {
    if (!guardUnsavedEdits()) return;
    const target = index + direction;
    if (target < 0 || target >= game.questions.length) return;
    const ids = game.questions.map((q) => q.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setStructuralBusy("reorder");
    try {
      const result = await apiFetch<AIGeneratedGame>(`/admin/ai-games/${game.id}/questions/reorder`, {
        method: "POST",
        body: JSON.stringify({ question_ids: ids }),
      });
      onReviewed(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao reordenar.");
    } finally {
      setStructuralBusy(null);
    }
  }

  async function regenerateQuestion(questionId: string) {
    if (!guardUnsavedEdits()) return;
    setStructuralBusy(questionId);
    try {
      const result = await apiFetch<AIGeneratedGame>(`/admin/ai-games/${game.id}/questions/${questionId}/regenerate`, { method: "POST" });
      onReviewed(result);
      toast.success("Pergunta regenerada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao regenerar pergunta.");
    } finally {
      setStructuralBusy(null);
    }
  }

  async function review(action: "approve" | "reject") {
    setReviewing(true);
    try {
      const result = await apiFetch<AIGeneratedGame>(`/admin/ai-games/${game.id}/review`, {
        method: "POST",
        body: JSON.stringify({
          action,
          notes: notes || null,
          questions: editingQ,
          targets,
        }),
      });
      onReviewed(result);
      setEditingQ(null);
      toast.success(action === "approve" ? "Jogo aprovado." : "Jogo rejeitado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao revisar.");
    } finally {
      setReviewing(false);
    }
  }

  async function saveEdits() {
    if (!editingQ) return;
    setSaving(true);
    try {
      const result = await apiFetch<AIGeneratedGame>(`/admin/ai-games/${game.id}`, {
        method: "PATCH",
        body: JSON.stringify({ questions: editingQ, targets }),
      });
      onReviewed(result);
      setEditingQ(null);
      toast.success("Alteracoes salvas.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Excluir o jogo "${game.name}"? Esta acao nao pode ser desfeita.`)) return;
    setDeleting(true);
    try {
      await apiFetch(`/admin/ai-games/${game.id}`, { method: "DELETE" });
      onDeleted(game.id);
      toast.success("Jogo excluido.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir.");
      setDeleting(false);
    }
  }

  function updateOption(qi: number, oi: number, value: string) {
    const next = questions.map((q, i) =>
      i === qi ? { ...q, options: q.options.map((o, j) => (j === oi ? value : o)) } : q,
    );
    setEditingQ(next);
  }

  function updateField(qi: number, field: keyof GameQuestion, value: string | number) {
    const next = questions.map((q, i) => (i === qi ? { ...q, [field]: value } : q));
    setEditingQ(next);
  }

  return (
    <div className="rounded-card bg-card shadow-soft">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {statusBadge(game.status)}
            <Badge variant="outline" className="text-xs">{game.category}</Badge>
            <Badge variant="outline" className="text-xs">{game.difficulty}</Badge>
            {!game.targets.length ? <Badge variant="destructive" className="text-xs">Sem target</Badge> : null}
            {game.edited_after_generation ? <Badge variant="outline" className="text-xs">Editado</Badge> : null}
          </div>
          <p className="mt-1 font-semibold">{game.name}</p>
          <p className="text-xs text-muted-foreground">{game.skill} · {game.questions.length} questões</p>
        </div>
        {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
      </button>

      {open && (
        <div className="collapse-in border-t p-4 space-y-4">
          <div className="space-y-4">
            {questions.map((q, qi) => (
              <div key={q.id} className="rounded-control bg-background/60 p-3 shadow-soft space-y-2.5">
                <div className="flex items-start gap-2">
                  <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[0.65rem] font-bold text-primary">Q{qi + 1}</span>
                  <Textarea
                    value={q.prompt}
                    onChange={(e) => updateField(qi, "prompt", e.target.value)}
                    className="min-h-0 resize-none text-sm"
                    rows={2}
                  />
                </div>
                <div className="grid gap-1.5 pl-8">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateField(qi, "answer_index", oi)}
                        className={cn(
                          "h-5 w-5 shrink-0 rounded-full border-2 transition-colors",
                          q.answer_index === oi ? "border-primary bg-primary" : "border-muted-foreground hover:border-primary/50",
                        )}
                        title="Marcar como correta"
                        aria-label={`Marcar alternativa ${oi + 1} como correta`}
                      />
                      <Input value={opt} onChange={(e) => updateOption(qi, oi, e.target.value)} className="h-9 flex-1 text-xs" />
                    </div>
                  ))}
                </div>
                <div className="pl-8">
                  <p className="text-xs text-muted-foreground mb-1">Explicação:</p>
                  <Input value={q.explanation} onChange={(e) => updateField(qi, "explanation", e.target.value)} className="h-9 text-xs" />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pl-8">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => regenerateQuestion(q.id)}
                    disabled={structuralBusy !== null}
                  >
                    {structuralBusy === q.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                    Regenerar pergunta
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => moveQuestion(qi, -1)}
                    disabled={structuralBusy !== null || qi === 0}
                    aria-label="Mover pergunta para cima"
                  >
                    ↑
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => moveQuestion(qi, 1)}
                    disabled={structuralBusy !== null || qi === questions.length - 1}
                    aria-label="Mover pergunta para baixo"
                  >
                    ↓
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto h-7 px-2 text-xs text-destructive hover:text-destructive"
                    onClick={() => removeQuestion(q.id)}
                    disabled={structuralBusy !== null || questions.length <= 1}
                  >
                    {structuralBusy === q.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                    Remover
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={addQuestion} disabled={structuralBusy !== null}>
              {structuralBusy === "add" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Adicionar pergunta
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPreviewOpen(true)}>
              <Eye className="h-3.5 w-3.5" />
              Pré-visualizar
            </Button>
          </div>

          <GamePreviewModal
            open={previewOpen}
            onClose={() => setPreviewOpen(false)}
            name={game.name}
            category={game.category}
            skill={game.skill}
            difficulty={game.difficulty}
            questions={questions}
          />

          {editingQ && game.status === "pending" && (
            <p className="text-xs text-streak">Questões editadas. As alterações serão salvas ao aprovar/rejeitar.</p>
          )}

          <TargetsField
            value={targets}
            onChange={setTargets}
            hint="Obrigatório para aprovar — define quando o RecommendationEngine indica este jogo."
          />

          {game.status === "pending" ? (
            <div className="space-y-3">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas internas (opcional)..."
                className="min-h-0 resize-none"
                rows={2}
              />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => review("approve")} disabled={reviewing || !targets.length}>
                  {reviewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Aprovar
                </Button>
                <Button size="sm" variant="outline" onClick={() => review("reject")} disabled={reviewing}>
                  Rejeitar
                </Button>
                <Button size="sm" variant="destructive" onClick={remove} disabled={deleting} className="ml-auto">
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {editingQ && (
                <Button size="sm" onClick={saveEdits} disabled={saving}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Salvar alterações
                </Button>
              )}
              <Button size="sm" variant="destructive" onClick={remove} disabled={deleting} className="ml-auto">
                <Trash2 className="h-3.5 w-3.5" />
                Excluir
              </Button>
            </div>
          )}

          {game.admin_notes && (
            <p className="text-xs text-muted-foreground italic">Notas: {game.admin_notes}</p>
          )}

          <HistoryPanel contentType="AIGeneratedGame" contentId={game.id} users={users} />
        </div>
      )}
    </div>
  );
}

export function AIGamesTab({
  games,
  users,
  onReviewed,
  onDeleted,
}: {
  games: AIGeneratedGame[];
  users: AdminUser[];
  onReviewed: (updated: AIGeneratedGame) => void;
  onDeleted: (gameId: number) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const filtered = statusFilter === "all" ? games : games.filter((g) => g.status === statusFilter);
  const pendingCount = games.filter((g) => g.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Filter + list */}
      <div className="flex flex-wrap gap-2">
        {(["all", "pending", "approved", "rejected"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={cn(
              "rounded-control border px-3 py-1.5 text-xs font-medium transition-colors",
              statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted",
            )}
          >
            {s === "all" ? "Todos" : s === "pending" ? `Pendentes (${pendingCount})` : s === "approved" ? "Aprovados" : "Rejeitados"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((game) => (
          <GameCard key={game.id} game={game} users={users} onReviewed={onReviewed} onDeleted={onDeleted} />
        ))}
        {filtered.length === 0 && (
          <div className="rounded-card bg-card p-8 text-center shadow-soft">
            <p className="text-sm text-muted-foreground">
              {statusFilter === "pending" ? "Nenhum jogo pendente de revisão — tudo em dia." : "Nenhum jogo encontrado com esse filtro."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
