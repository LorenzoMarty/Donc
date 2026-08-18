"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Eye, Loader2, Plus, Save, Search, Sparkles, Trash2, Wand2, X } from "lucide-react";
import { toast } from "sonner";

import { TargetsField } from "@/app/(app)/admin/_tabs/components/targets-field";
import { engineLabel } from "@/app/(app)/admin/_tabs/ai-labels";
import { GamePayloadEditor } from "@/app/(app)/admin/_tabs/game-payload-editors";
import { GamePreviewModal } from "@/app/(app)/admin/_tabs/game-preview";
import { HistoryPanel } from "@/app/(app)/admin/_tabs/components/history-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/http-client";
import type { AdminUser, AIGeneratedGame, GameQuestion } from "@/types/api";
import { cn } from "@/utils";

// Engines cujo conteudo mora em `questions` — os outros usam `payload`, editor dedicado por tipo
// (spec migrar-jogos-estaticos-para-banco REQ-5).
const QUESTION_BASED_ENGINES = new Set(["quiz", "timed-rush", "sequence", "choice"]);

function statusBadge(status: string) {
  if (status === "approved") return <Badge variant="success" className="text-xs">Aprovado</Badge>;
  if (status === "rejected") return <Badge variant="destructive" className="text-xs">Rejeitado</Badge>;
  return <Badge variant="outline" className="text-xs">Pendente</Badge>;
}

/**
 * Editor completo de um jogo — antes vivia dentro do dropdown de `GameCard` na lista; agora é a
 * tela dedicada `/admin/jogos/[id]` (pedido do usuário: tabela + tela separada em vez de dropdown).
 */
export function GameEditorPanel({
  game,
  users,
  allGames,
  onReviewed,
  onDeleted,
}: {
  game: AIGeneratedGame;
  users: AdminUser[];
  allGames: AIGeneratedGame[];
  onReviewed: (updated: AIGeneratedGame) => void;
  onDeleted: (gameId: number) => void;
}) {
  const [editingQ, setEditingQ] = useState<GameQuestion[] | null>(null);
  const [editingPayload, setEditingPayload] = useState<Record<string, unknown> | null>(null);
  const [targets, setTargets] = useState<string[]>(game.targets);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [structuralBusy, setStructuralBusy] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [generateCount, setGenerateCount] = useState(3);
  const [generatingMore, setGeneratingMore] = useState(false);
  const [payloadGenerateCount, setPayloadGenerateCount] = useState(2);
  const [generatingPayload, setGeneratingPayload] = useState(false);

  const isQuestionEngine = QUESTION_BASED_ENGINES.has(game.engine);
  const questions = editingQ ?? game.questions;
  const pendingCount = game.questions.filter((q) => q.status === "pending").length;

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

  async function generateMore() {
    if (!guardUnsavedEdits()) return;
    setGeneratingMore(true);
    try {
      const result = await apiFetch<AIGeneratedGame>(`/admin/ai-games/${game.id}/questions/generate`, {
        method: "POST",
        body: JSON.stringify({ count: generateCount }),
      });
      onReviewed(result);
      toast.success("Perguntas geradas — revise antes de aprovar.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar perguntas.");
    } finally {
      setGeneratingMore(false);
    }
  }

  async function generateMorePayloadItems() {
    if (editingPayload) {
      toast.error("Salve ou descarte as alterações antes de gerar mais conteúdo.");
      return;
    }
    setGeneratingPayload(true);
    try {
      const result = await apiFetch<AIGeneratedGame>(`/admin/ai-games/${game.id}/payload-items/generate`, {
        method: "POST",
        body: JSON.stringify({ count: payloadGenerateCount }),
      });
      onReviewed(result);
      toast.success("Conteúdo gerado — revise antes de publicar.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar conteúdo.");
    } finally {
      setGeneratingPayload(false);
    }
  }

  async function reviewQuestion(questionId: string, action: "approve" | "reject") {
    if (!guardUnsavedEdits()) return;
    setStructuralBusy(questionId);
    try {
      const result = await apiFetch<AIGeneratedGame>(`/admin/ai-games/${game.id}/questions/${questionId}/review`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      onReviewed(result);
      toast.success(action === "approve" ? "Pergunta aprovada." : "Pergunta rejeitada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao revisar pergunta.");
    } finally {
      setStructuralBusy(null);
    }
  }

  async function saveEdits() {
    if (!editingQ && !editingPayload) return;
    setSaving(true);
    try {
      const result = await apiFetch<AIGeneratedGame>(`/admin/ai-games/${game.id}`, {
        method: "PATCH",
        body: JSON.stringify({ questions: editingQ, payload: editingPayload, targets }),
      });
      onReviewed(result);
      setEditingQ(null);
      setEditingPayload(null);
      toast.success("Alterações salvas.");
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
      toast.success("Jogo excluído.");
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
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          {statusBadge(game.status)}
          <Badge variant="outline" className="text-xs">{game.category}</Badge>
          <Badge variant="outline" className="text-xs">{game.difficulty}</Badge>
          {!game.targets.length ? <Badge variant="destructive" className="text-xs">Sem objetivo</Badge> : null}
          {game.edited_after_generation ? <Badge variant="outline" className="text-xs">Editado</Badge> : null}
          {pendingCount > 0 ? <Badge variant="secondary" className="text-xs">{pendingCount} pendente{pendingCount > 1 ? "s" : ""}</Badge> : null}
        </div>
        <p className="mt-1 font-semibold">{game.name}</p>
        <p className="text-xs text-muted-foreground">
          {game.skill} · {engineLabel(game.engine)}
          {isQuestionEngine ? ` · ${game.questions.length} questões` : ""}
        </p>
      </div>

      <div className="border-t p-4 space-y-4">
          {!isQuestionEngine && (
            <>
              <GamePayloadEditor
                engine={game.engine}
                payload={editingPayload ?? game.payload ?? {}}
                onChange={setEditingPayload}
                allGames={allGames}
                currentGameId={game.id}
              />
              {game.engine !== "survival" && (
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={payloadGenerateCount}
                    onChange={(e) => setPayloadGenerateCount(Number(e.target.value))}
                    className="h-8 w-16 text-xs"
                    aria-label="Quantidade de itens a gerar"
                  />
                  <Button size="sm" onClick={generateMorePayloadItems} disabled={generatingPayload}>
                    {generatingPayload ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    Gerar mais conteúdo com IA
                  </Button>
                </div>
              )}
            </>
          )}

          {isQuestionEngine && (
          <>
          <div className="space-y-4">
            {questions.map((q, qi) => (
              <div key={q.id} className="rounded-control bg-background/60 p-3 shadow-soft space-y-2.5">
                <div className="flex items-start gap-2">
                  <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[0.65rem] font-bold text-primary">Q{qi + 1}</span>
                  {q.status === "pending" ? <Badge variant="secondary" className="mt-2 shrink-0 text-[10px]">Pendente</Badge> : null}
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
                  {q.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => reviewQuestion(q.id, "approve")}
                        disabled={structuralBusy !== null}
                      >
                        {structuralBusy === q.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                        onClick={() => reviewQuestion(q.id, "reject")}
                        disabled={structuralBusy !== null}
                      >
                        {structuralBusy === q.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                        Rejeitar
                      </Button>
                    </>
                  )}
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

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={addQuestion} disabled={structuralBusy !== null}>
              {structuralBusy === "add" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Adicionar pergunta
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPreviewOpen(true)}>
              <Eye className="h-3.5 w-3.5" />
              Pré-visualizar
            </Button>
            <div className="ml-auto flex items-center gap-1.5">
              <Input
                type="number"
                min={1}
                max={10}
                value={generateCount}
                onChange={(e) => setGenerateCount(Number(e.target.value))}
                className="h-8 w-16 text-xs"
                aria-label="Quantidade de perguntas a gerar"
              />
              <Button size="sm" onClick={generateMore} disabled={generatingMore || structuralBusy !== null}>
                {generatingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Gerar mais perguntas com IA
              </Button>
            </div>
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
          </>
          )}

          <TargetsField
            value={targets}
            onChange={setTargets}
            hint="Define quando o motor de recomendação indica este jogo."
          />

          <div className="flex flex-wrap items-center gap-2">
            {(editingQ || editingPayload) && (
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

          {game.admin_notes && (
            <p className="text-xs text-muted-foreground italic">Notas: {game.admin_notes}</p>
          )}

          <HistoryPanel contentType="AIGeneratedGame" contentId={game.id} users={users} />
      </div>
    </div>
  );
}

export function AIGamesTab({ games }: { games: AIGeneratedGame[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filtered = query
    ? games.filter((g) => g.name.toLowerCase().includes(query.toLowerCase()) || g.skill.toLowerCase().includes(query.toLowerCase()))
    : games;

  return (
    <div className="space-y-6">
      <div className="relative min-w-[200px] flex-1">
        <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar jogo por nome ou habilidade..." className="pl-9" />
      </div>

      <div className="rounded-card bg-card shadow-soft">
        <div className="mobile-scroll overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 font-medium">Dificuldade</th>
                <th className="px-4 py-3 font-medium">Situação</th>
                <th className="px-4 py-3 font-medium tabular-nums">Perguntas</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((game) => {
                const isQuestionEngine = QUESTION_BASED_ENGINES.has(game.engine);
                return (
                  <tr
                    key={game.id}
                    tabIndex={0}
                    role="button"
                    aria-label={`Abrir jogo ${game.name}`}
                    onClick={() => router.push(`/admin/jogos/${game.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") router.push(`/admin/jogos/${game.id}`);
                    }}
                    className="cursor-pointer border-b last:border-b-0 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
                  >
                    <td className="px-4 py-3 font-medium">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {game.name}
                        {!game.targets.length ? <Badge variant="destructive" className="text-[10px]">Sem objetivo</Badge> : null}
                        {game.edited_after_generation ? <Badge variant="outline" className="text-[10px]">Editado</Badge> : null}
                      </div>
                      <p className="text-xs text-muted-foreground">{game.skill}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{game.category}</td>
                    <td className="px-4 py-3 text-muted-foreground">{game.difficulty}</td>
                    <td className="px-4 py-3">{statusBadge(game.status)}</td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {isQuestionEngine ? game.questions.length : "—"}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum jogo encontrado com essa busca.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
