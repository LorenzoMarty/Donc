"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Save, Sparkles, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/http-client";
import type { AIGeneratedGame, GameQuestion } from "@/types/api";
import { cn } from "@/utils";

const CATEGORIES = [
  { value: "coesao", label: "Coesão" },
  { value: "argumentacao", label: "Argumentação" },
  { value: "estrutura", label: "Estrutura" },
  { value: "repertorio", label: "Repertório" },
  { value: "gramatica", label: "Gramática" },
  { value: "competencias-enem", label: "Competências ENEM" },
];

const DIFFICULTIES = [
  { value: "easy", label: "Essencial" },
  { value: "medium", label: "Intermediário" },
  { value: "hard", label: "Avançado" },
];

function statusBadge(status: string) {
  if (status === "approved") return <Badge variant="success" className="text-xs">Aprovado</Badge>;
  if (status === "rejected") return <Badge variant="destructive" className="text-xs">Rejeitado</Badge>;
  return <Badge variant="outline" className="text-xs">Pendente</Badge>;
}

function GameCard({
  game,
  onReviewed,
  onDeleted,
}: {
  game: AIGeneratedGame;
  onReviewed: (updated: AIGeneratedGame) => void;
  onDeleted: (gameId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editingQ, setEditingQ] = useState<GameQuestion[] | null>(null);
  const [notes, setNotes] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const questions = editingQ ?? game.questions;

  async function review(action: "approve" | "reject") {
    setReviewing(true);
    try {
      const result = await apiFetch<AIGeneratedGame>(`/admin/ai-games/${game.id}/review`, {
        method: "POST",
        body: JSON.stringify({
          action,
          notes: notes || null,
          questions: editingQ,
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
        body: JSON.stringify({ questions: editingQ }),
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
          </div>
          <p className="mt-1 font-semibold">{game.name}</p>
          <p className="text-xs text-muted-foreground">{game.skill} · {game.questions.length} questões · {game.xp_reward} XP</p>
        </div>
        {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
      </button>

      {open && (
        <div className="collapse-in border-t p-4 space-y-4">
          <div className="space-y-4">
            {questions.map((q, qi) => (
              <div key={qi} className="rounded-control bg-background/60 p-3 shadow-soft space-y-2.5">
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
              </div>
            ))}
          </div>

          {editingQ && game.status === "pending" && (
            <p className="text-xs text-streak">Questões editadas. As alterações serão salvas ao aprovar/rejeitar.</p>
          )}

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
                <Button size="sm" onClick={() => review("approve")} disabled={reviewing}>
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
        </div>
      )}
    </div>
  );
}

export function AIGamesTab({
  games,
  onGenerated,
  onReviewed,
  onDeleted,
}: {
  games: AIGeneratedGame[];
  onGenerated: (game: AIGeneratedGame) => void;
  onReviewed: (updated: AIGeneratedGame) => void;
  onDeleted: (gameId: number) => void;
}) {
  const [skill, setSkill] = useState("");
  const [category, setCategory] = useState("coesao");
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState(5);
  const [gamesCount, setGamesCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  async function generate() {
    if (!skill.trim()) {
      toast.error("Informe a habilidade que o jogo vai treinar.");
      return;
    }
    setGenerating(true);
    const total = Math.min(Math.max(gamesCount, 1), 5);
    let created = 0;
    try {
      for (let i = 0; i < total; i++) {
        const game = await apiFetch<AIGeneratedGame>("/admin/ai-games/generate", {
          method: "POST",
          body: JSON.stringify({ skill: skill.trim(), category, difficulty, count }),
        });
        onGenerated(game);
        created++;
      }
      toast.success(`${created} ${created === 1 ? "jogo gerado" : "jogos gerados"}. Revise antes de aprovar.`);
      setSkill("");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? created > 0
            ? `${created} gerado(s); falha no restante: ${err.message}`
            : err.message
          : "Erro ao gerar jogo.",
      );
    } finally {
      setGenerating(false);
    }
  }

  const filtered = statusFilter === "all" ? games : games.filter((g) => g.status === statusFilter);
  const pendingCount = games.filter((g) => g.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Generator panel */}
      <div className="rounded-card bg-card p-5 shadow-soft space-y-4">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Gerar novo jogo com IA</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Habilidade" className="lg:col-span-2">
            <Input value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="ex: uso de conectivos adversativos" />
          </Field>
          <Field label="Categoria">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
          </Field>
          <Field label="Dificuldade">
            <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              {DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </Select>
          </Field>
          <Field label="Questões por jogo">
            <Input type="number" min={3} max={10} value={count} onChange={(e) => setCount(Number(e.target.value))} />
          </Field>
          <Field label="Quantidade de jogos">
            <Input type="number" min={1} max={5} value={gamesCount} onChange={(e) => setGamesCount(Number(e.target.value))} />
          </Field>
        </div>
        <Button onClick={generate} disabled={generating}>
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {generating ? "Gerando..." : "Gerar jogo"}
        </Button>
      </div>

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
          <GameCard key={game.id} game={game} onReviewed={onReviewed} onDeleted={onDeleted} />
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
