"use client";

import { useState } from "react";
import { Gamepad2, GraduationCap, Loader2, Sparkles, FileText } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiFetch } from "@/services/api";
import type { AdminModule, AIGeneratedExercise, AIGeneratedGame, EssayTheme } from "@/types/api";
import { cn } from "@/utils";

type ContentKind = "game" | "exercise" | "theme";

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

const KINDS: { value: ContentKind; label: string; icon: typeof Gamepad2 }[] = [
  { value: "game", label: "Jogo", icon: Gamepad2 },
  { value: "exercise", label: "Exercício", icon: GraduationCap },
  { value: "theme", label: "Tema de redação", icon: FileText },
];

/**
 * REQ-6/7 (P3b): fluxo guiado único de geração por IA — escolhe tipo primeiro, depois conceitos
 * pedagógicos (objetivo/problema trabalhado/dificuldade). Substitui os 3 painéis dispersos que
 * existiam antes (ai-games.tsx, modules.tsx, themes.tsx).
 */
export function CreateWithAiTab({
  modules,
  onGameGenerated,
  onExerciseGenerated,
  onThemeGenerated,
}: {
  modules: AdminModule[];
  onGameGenerated: (game: AIGeneratedGame) => void;
  onExerciseGenerated: (exercise: AIGeneratedExercise) => void;
  onThemeGenerated: (theme: EssayTheme) => void;
}) {
  const [kind, setKind] = useState<ContentKind>("game");

  return (
    <div className="max-w-2xl space-y-4">
      <div className="rounded-card bg-card p-5 shadow-soft space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Criar conteúdo com IA</h2>
        </div>

        <Field label="O que deseja criar?">
          <div className="grid grid-cols-3 gap-2">
            {KINDS.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setKind(option.value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-control border px-3 py-3 text-xs font-medium transition-colors",
                    kind === option.value ? "border-primary bg-primary/8 text-primary" : "border-border hover:bg-muted",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </Field>

        {kind === "game" && <GameGeneratorForm onGenerated={onGameGenerated} />}
        {kind === "exercise" && <ExerciseGeneratorForm modules={modules} onGenerated={onExerciseGenerated} />}
        {kind === "theme" && <ThemeGeneratorForm onGenerated={onThemeGenerated} />}
      </div>
    </div>
  );
}

function GameGeneratorForm({ onGenerated }: { onGenerated: (game: AIGeneratedGame) => void }) {
  const [skill, setSkill] = useState("");
  const [category, setCategory] = useState("coesao");
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState(5);
  const [generating, setGenerating] = useState(false);

  async function generate() {
    if (!skill.trim()) {
      toast.error("Informe o problema trabalhado (habilidade) que o jogo vai treinar.");
      return;
    }
    setGenerating(true);
    try {
      const game = await apiFetch<AIGeneratedGame>("/admin/ai-games/generate", {
        method: "POST",
        body: JSON.stringify({ skill: skill.trim(), category, difficulty, count }),
      });
      onGenerated(game);
      setSkill("");
      toast.success("Jogo gerado. Revise na aba Revisões.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar jogo.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="grid gap-3">
      <Field label="Problema trabalhado">
        <Input value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="ex: uso de conectivos adversativos" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Objetivo pedagógico">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
        </Field>
        <Field label="Dificuldade">
          <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            {DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Quantidade de perguntas">
        <Input type="number" min={3} max={10} value={count} onChange={(e) => setCount(Number(e.target.value))} />
      </Field>
      <Button onClick={generate} disabled={generating}>
        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {generating ? "Gerando..." : "Gerar conteúdo"}
      </Button>
    </div>
  );
}

function ExerciseGeneratorForm({
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

function ThemeGeneratorForm({ onGenerated }: { onGenerated: (theme: EssayTheme) => void }) {
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
