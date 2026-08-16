"use client";

import { useState } from "react";
import { ClipboardList, Pencil, Search } from "lucide-react";

import { ActivityModal, normalizedItems, type ModalState } from "@/app/(app)/admin/_tabs/modules";
import { GenerateWithAiButton } from "@/app/(app)/admin/_tabs/components/generate-with-ai-button";
import { ExerciseGeneratorForm } from "@/app/(app)/admin/_tabs/create-with-ai";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { AdminActivity, AdminModule } from "@/types/api";

const DIFFICULTY_LABELS: Record<string, string> = { easy: "Essencial", medium: "Intermediário", hard: "Avançado" };

type FlatExercise = { activity: AdminActivity; module: AdminModule };

export function flattenExercises(modules: AdminModule[]): FlatExercise[] {
  return modules.flatMap((module) =>
    normalizedItems(module)
      .filter((item) => item.kind === "activity" && item.activity)
      .map((item) => ({ activity: item.activity as AdminActivity, module })),
  );
}

/**
 * REQ-4 (admin-reorganizacao-ux): aba própria pra achar e editar exercícios sem navegar módulo por
 * módulo — reaproveita os dados já carregados em `GET /admin/content` (sem endpoint novo) e o
 * mesmo `ActivityModal` de edição já usado dentro de Módulos.
 */
export function ExercisesTab({
  modules,
  onModulesChanged,
}: {
  modules: AdminModule[];
  onModulesChanged: (modules: AdminModule[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<Extract<ModalState, { kind: "activity" }> | null>(null);

  const all = flattenExercises(modules);
  const filtered = query
    ? all.filter(
        ({ activity }) =>
          activity.statement.toLowerCase().includes(query.toLowerCase()) || activity.skill.toLowerCase().includes(query.toLowerCase()),
      )
    : all;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar exercício por enunciado ou habilidade..." className="pl-9" />
        </div>
        <Badge variant="outline">{all.length} exercícios</Badge>
        <GenerateWithAiButton
          label="Gerar exercício com IA"
          title="Gerar exercício com IA"
          description="Escolha o módulo e as aulas base — o exercício nasce pendente de revisão."
        >
          {(close) => <ExerciseGeneratorForm modules={modules} onGenerated={() => close()} />}
        </GenerateWithAiButton>
      </div>

      <div className="grid gap-2">
        {filtered.map(({ activity, module }) => (
          <button
            key={activity.id}
            type="button"
            onClick={() => setModal({ kind: "activity", mode: "edit", module, activity })}
            className="game-tile flex items-start gap-3 bg-card p-3 text-left transition-colors hover:bg-muted/40"
          >
            <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-streak" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-safe line-clamp-2 text-sm font-medium leading-5">{activity.statement}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span>{module.title}</span>
                <span aria-hidden="true">·</span>
                <span>{activity.skill}</span>
                <Badge variant="outline" className="text-[0.65rem]">{DIFFICULTY_LABELS[activity.difficulty] ?? activity.difficulty}</Badge>
              </div>
            </div>
            <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
        ))}
        {!filtered.length ? (
          <p className="rounded-card bg-card p-6 text-sm text-muted-foreground shadow-soft">
            {all.length ? "Nenhum exercício encontrado com essa busca." : "Nenhum exercício cadastrado ainda — crie um em Módulos ou gere com IA."}
          </p>
        ) : null}
      </div>

      {modal ? (
        <ActivityModal
          state={modal}
          onClose={() => setModal(null)}
          onUpdated={(updated) => {
            onModulesChanged(updated);
            setModal(null);
          }}
        />
      ) : null}
    </div>
  );
}
