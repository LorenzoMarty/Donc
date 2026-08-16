"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Gamepad2, GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { apiFetch } from "@/services/api";
import type { AIGeneratedExercise, AIGeneratedGame, EssayTheme, ReviewQueueItem } from "@/types/api";

const ISSUE_OPTIONS = [
  { code: "TEXT_ROBOTIC", label: "Texto robótico" },
  { code: "REPETITIVE_IDEAS", label: "Repetição de ideias" },
  { code: "WEAK_REPERTOIRE", label: "Repertório forçado" },
  { code: "SHALLOW_ARGUMENTATION", label: "Argumentação rasa" },
  { code: "WEAK_THESIS", label: "Tese vaga" },
  { code: "C3_LOW", label: "Progressão (C3)" },
  { code: "FORMULAIC_CONCLUSION", label: "Conclusão clichê" },
];

const DIFFICULTY_LABELS: Record<string, string> = { easy: "Essencial", medium: "Intermediário", hard: "Avançado" };

const TYPE_META: Record<ReviewQueueItem["content_type"], { label: string; icon: typeof Gamepad2; tab: string }> = {
  game: { label: "Jogo", icon: Gamepad2, tab: "games" },
  exercise: { label: "Exercício", icon: GraduationCap, tab: "exercises" },
  theme: { label: "Tema de redação", icon: FileText, tab: "themes" },
};

function queueUrl(contentType: string, target: string, difficulty: string): string {
  const params = new URLSearchParams();
  if (contentType) params.set("content_type", contentType);
  if (target) params.set("target", target);
  if (difficulty) params.set("difficulty", difficulty);
  const query = params.toString();
  return `/admin/review-queue${query ? `?${query}` : ""}`;
}

/**
 * REQ-4/5 (P3b): fila de revisão unificada — agrega pendente de jogo+exercício+tema numa lista
 * só, com filtros. Aprovar/rejeitar acontece direto aqui (via endpoint de review de cada tipo);
 * "Editar" leva pra aba do tipo, onde o editor completo (ex.: o editor granular de perguntas do
 * P3a) já existe.
 */
export function ReviewQueueTab({
  onOpenTab,
  onGameReviewed,
  onExerciseReviewed,
  onThemeReviewed,
}: {
  onOpenTab: (tab: string) => void;
  onGameReviewed: (game: AIGeneratedGame) => void;
  onExerciseReviewed: (exercise: AIGeneratedExercise) => void;
  onThemeReviewed: (theme: EssayTheme) => void;
}) {
  const router = useRouter();
  const [items, setItems] = useState<ReviewQueueItem[] | null>(null);
  const [contentType, setContentType] = useState("");
  const [target, setTarget] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function load() {
    const data = await apiFetch<ReviewQueueItem[]>(queueUrl(contentType, target, difficulty));
    setItems(data);
  }

  useEffect(() => {
    apiFetch<ReviewQueueItem[]>(queueUrl(contentType, target, difficulty)).then(setItems);
  }, [contentType, target, difficulty]);

  async function review(item: ReviewQueueItem, action: "approve" | "reject") {
    const key = `${item.content_type}-${item.content_id}`;
    setBusyKey(key);
    try {
      if (item.content_type === "game") {
        const game = await apiFetch<AIGeneratedGame>(`/admin/ai-games/${item.content_id}/review`, {
          method: "POST",
          body: JSON.stringify({ action }),
        });
        onGameReviewed(game);
      } else if (item.content_type === "exercise") {
        const exercise = await apiFetch<AIGeneratedExercise>(`/admin/ai-exercises/${item.content_id}/review`, {
          method: "POST",
          body: JSON.stringify({ action }),
        });
        onExerciseReviewed(exercise);
      } else {
        const theme = await apiFetch<EssayTheme>(`/admin/essay-themes/${item.content_id}/review`, {
          method: "POST",
          body: JSON.stringify({ action }),
        });
        onThemeReviewed(theme);
      }
      toast.success(action === "approve" ? "Conteúdo aprovado." : "Conteúdo rejeitado.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível revisar este item.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-card bg-card p-4 shadow-soft">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Tipo">
            <Select value={contentType} onChange={(e) => setContentType(e.target.value)}>
              <option value="">Todos</option>
              <option value="game">Jogo</option>
              <option value="exercise">Exercício</option>
              <option value="theme">Tema de redação</option>
            </Select>
          </Field>
          <Field label="Problema trabalhado">
            <Select value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">Todos</option>
              {ISSUE_OPTIONS.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
            </Select>
          </Field>
          <Field label="Dificuldade">
            <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option value="">Todas</option>
              <option value="easy">Essencial</option>
              <option value="medium">Intermediário</option>
              <option value="hard">Avançado</option>
            </Select>
          </Field>
        </div>
      </div>

      <div className="space-y-3">
        {items === null && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        {items?.length === 0 && (
          <div className="rounded-card bg-card p-8 text-center shadow-soft">
            <p className="text-sm text-muted-foreground">Nada aguardando revisão — tudo em dia.</p>
          </div>
        )}
        {items?.map((item) => {
          const key = `${item.content_type}-${item.content_id}`;
          const meta = TYPE_META[item.content_type];
          const Icon = meta.icon;
          const busy = busyKey === key;
          return (
            <div key={key} className="rounded-card bg-card p-4 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <Badge variant="outline" className="text-xs">{meta.label}</Badge>
                    {item.difficulty && <Badge variant="outline" className="text-xs">{DIFFICULTY_LABELS[item.difficulty] ?? item.difficulty}</Badge>}
                  </div>
                  <p className="mt-1.5 text-safe text-sm font-semibold leading-5">{item.title}</p>
                  {item.skill && <p className="mt-0.5 text-xs text-muted-foreground">{item.skill}</p>}
                  {item.targets.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.targets.map((code) => (
                        <Badge key={code} variant="secondary" className="text-[11px]">
                          {ISSUE_OPTIONS.find((o) => o.code === code)?.label ?? code}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => (item.content_type === "game" ? router.push(`/admin/jogos/${item.content_id}`) : onOpenTab(meta.tab))}
                  >
                    Editar
                  </Button>
                  <Button size="sm" disabled={busy} onClick={() => review(item, "approve")}>
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Aprovar
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => review(item, "reject")}>
                    Rejeitar
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
