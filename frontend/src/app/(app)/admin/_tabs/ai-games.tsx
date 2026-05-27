"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
}: {
  game: AIGeneratedGame;
  onReviewed: (updated: AIGeneratedGame) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editingQ, setEditingQ] = useState<GameQuestion[] | null>(null);
  const [notes, setNotes] = useState("");
  const [reviewing, setReviewing] = useState(false);

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
      toast.success(action === "approve" ? "Jogo aprovado." : "Jogo rejeitado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao revisar.");
    } finally {
      setReviewing(false);
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
    <div className="rounded-lg border bg-card">
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
        <div className="border-t p-4 space-y-4">
          <div className="space-y-4">
            {questions.map((q, qi) => (
              <div key={qi} className="rounded-md border bg-background/60 p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-xs font-bold text-muted-foreground shrink-0">Q{qi + 1}</span>
                  <textarea
                    value={q.prompt}
                    onChange={(e) => updateField(qi, "prompt", e.target.value)}
                    className="w-full resize-none rounded border bg-background p-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                    rows={2}
                  />
                </div>
                <div className="grid gap-1.5 pl-5">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateField(qi, "answer_index", oi)}
                        className={cn(
                          "h-5 w-5 shrink-0 rounded-full border-2 transition-colors",
                          q.answer_index === oi ? "border-primary bg-primary" : "border-muted-foreground",
                        )}
                        title="Marcar como correta"
                      />
                      <input
                        value={opt}
                        onChange={(e) => updateOption(qi, oi, e.target.value)}
                        className="flex-1 rounded border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  ))}
                </div>
                <div className="pl-5">
                  <p className="text-xs text-muted-foreground mb-1">Explicação:</p>
                  <input
                    value={q.explanation}
                    onChange={(e) => updateField(qi, "explanation", e.target.value)}
                    className="w-full rounded border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
            ))}
          </div>

          {editingQ && (
            <p className="text-xs text-amber-600">Questões editadas. As alterações serão salvas ao aprovar/rejeitar.</p>
          )}

          {game.status === "pending" && (
            <div className="space-y-3">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas internas (opcional)..."
                className="w-full resize-none rounded border bg-background p-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                rows={2}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => review("approve")} disabled={reviewing}>
                  {reviewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Aprovar
                </Button>
                <Button size="sm" variant="outline" onClick={() => review("reject")} disabled={reviewing}>
                  Rejeitar
                </Button>
              </div>
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
}: {
  games: AIGeneratedGame[];
  onGenerated: (game: AIGeneratedGame) => void;
  onReviewed: (updated: AIGeneratedGame) => void;
}) {
  const [skill, setSkill] = useState("");
  const [category, setCategory] = useState("coesao");
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  async function generate() {
    if (!skill.trim()) {
      toast.error("Informe a habilidade que o jogo vai treinar.");
      return;
    }
    setGenerating(true);
    try {
      const game = await apiFetch<AIGeneratedGame>("/admin/ai-games/generate", {
        method: "POST",
        body: JSON.stringify({ skill: skill.trim(), category, difficulty, count }),
      });
      onGenerated(game);
      toast.success(`Jogo "${game.name}" gerado. Revise antes de aprovar.`);
      setSkill("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar jogo.");
    } finally {
      setGenerating(false);
    }
  }

  const filtered = statusFilter === "all" ? games : games.filter((g) => g.status === statusFilter);
  const pendingCount = games.filter((g) => g.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Generator panel */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Gerar novo jogo com IA</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="text-xs text-muted-foreground">Habilidade</label>
            <input
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              placeholder="ex: uso de conectivos adversativos"
              className="mt-1 w-full rounded border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Categoria</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
            >
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Dificuldade</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="mt-1 w-full rounded border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
            >
              {DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Quantidade de questões</label>
            <input
              type="number"
              min={3}
              max={10}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="mt-1 w-full rounded border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
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
              "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
              statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted",
            )}
          >
            {s === "all" ? "Todos" : s === "pending" ? `Pendentes (${pendingCount})` : s === "approved" ? "Aprovados" : "Rejeitados"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((game) => (
          <GameCard key={game.id} game={game} onReviewed={onReviewed} />
        ))}
        {filtered.length === 0 && (
          <div className="rounded-lg border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {statusFilter === "pending" ? "Sem jogos pendentes de revisão." : "Nenhum jogo encontrado."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
