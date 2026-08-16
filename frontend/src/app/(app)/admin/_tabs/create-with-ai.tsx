"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiFetch } from "@/services/api";
import type { AdminModule, AIGeneratedExercise, EssayTheme } from "@/types/api";

const DIFFICULTIES = [
  { value: "easy", label: "Essencial" },
  { value: "medium", label: "Intermediário" },
  { value: "hard", label: "Avançado" },
];

/**
 * REQ-3 (admin-reorganizacao-ux): geração por IA embutida como ação "Gerar com IA" dentro de cada
 * tela de conteúdo (Módulos/Exercícios, Temas) via `GenerateWithAiButton`. Jogos não têm geração —
 * o catálogo é fixo, só as perguntas de cada jogo nascem/mudam via IA (ver `ai-games.tsx`).
 */
export function ExerciseGeneratorForm({
  modules,
  onGenerated,
}: {
  modules: AdminModule[];
  onGenerated: (exercise: AIGeneratedExercise) => void;
}) {
  const [moduleId, setModuleId] = useState<number | null>(modules[0]?.id ?? null);
  const [lessonIds, setLessonIds] = useState<number[]>([]);
  const [difficulty, setDifficulty] = useState("medium");
  const [focus, setFocus] = useState("");
  const [generating, setGenerating] = useState(false);

  const selectedModule = modules.find((m) => m.id === moduleId) ?? null;

  function toggleLesson(id: number, checked: boolean) {
    setLessonIds((prev) => (checked ? [...prev, id] : prev.filter((item) => item !== id)));
  }

  async function generate() {
    if (!moduleId || !lessonIds.length) {
      toast.error("Escolha o módulo e ao menos uma aula base.");
      return;
    }
    setGenerating(true);
    try {
      const generated = await apiFetch<AIGeneratedExercise[]>(`/admin/modules/${moduleId}/activities/generate`, {
        method: "POST",
        body: JSON.stringify({ lesson_ids: lessonIds, difficulty, count: 1, focus: focus.trim() || null }),
      });
      const first = generated[0];
      if (first) {
        onGenerated(first);
        toast.success("Exercício gerado. Revise na aba Revisões.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar exercício.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="grid gap-3">
      <Field label="Módulo">
        <Select value={moduleId ?? ""} onChange={(e) => { setModuleId(Number(e.target.value)); setLessonIds([]); }}>
          {modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
        </Select>
      </Field>
      <Field label="Aulas base">
        <div className="grid gap-1 rounded-control bg-background/50 p-2 shadow-soft">
          {(selectedModule?.lessons ?? []).map((lesson) => (
            <label key={lesson.id} className="flex items-center gap-2 rounded-control px-2 py-1.5 text-xs hover:bg-muted/60">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[hsl(var(--primary))]"
                checked={lessonIds.includes(lesson.id)}
                onChange={(e) => toggleLesson(lesson.id, e.target.checked)}
              />
              {lesson.title}
            </label>
          ))}
          {!selectedModule?.lessons.length && <p className="px-2 py-1.5 text-xs text-muted-foreground">Este módulo ainda não tem aulas.</p>}
        </div>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Problema trabalhado (opcional)">
          <Input value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="ex: coesão entre parágrafos" />
        </Field>
        <Field label="Dificuldade">
          <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            {DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </Select>
        </Field>
      </div>
      <Button onClick={generate} disabled={generating}>
        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {generating ? "Gerando..." : "Gerar conteúdo"}
      </Button>
    </div>
  );
}

export function ThemeGeneratorForm({ onGenerated }: { onGenerated: (theme: EssayTheme) => void }) {
  const [focus, setFocus] = useState("");
  const [generating, setGenerating] = useState(false);

  async function generate() {
    setGenerating(true);
    try {
      const theme = await apiFetch<EssayTheme>("/admin/essay-themes/generate", {
        method: "POST",
        body: JSON.stringify({ focus: focus.trim() || null, supporting_text_requirements: [{ type: "motivador", count: 3 }] }),
      });
      onGenerated(theme);
      setFocus("");
      toast.success("Tema gerado. Revise na aba Revisões.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar tema.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="grid gap-3">
      <Field label="Objetivo pedagógico (opcional)">
        <Input value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="ex.: tecnologia, saúde pública" />
      </Field>
      <p className="text-xs text-muted-foreground">Gera 3 textos motivadores por padrão — ajuste os detalhes depois, na aba Temas.</p>
      <Button onClick={generate} disabled={generating}>
        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {generating ? "Gerando..." : "Gerar conteúdo"}
      </Button>
    </div>
  );
}
