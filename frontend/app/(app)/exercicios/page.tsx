"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, Filter, XCircle } from "lucide-react";

import { LoadingCard } from "@/components/app/loading-card";
import { MotionShell } from "@/components/app/motion-shell";
import { PageHeader, Surface } from "@/components/app/premium-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch, type Exercise } from "@/lib/api";
import { cn } from "@/lib/utils";

type Result = {
  exercise_id: number;
  selected_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation: string;
  next_difficulty: string;
  xp_earned: number;
};

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Record<number, string>>({});
  const [results, setResults] = useState<Record<number, Result>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Exercise[]>("/exercises")
      .then(setExercises)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return exercises;
    return exercises.filter((exercise) => exercise.difficulty === filter);
  }, [exercises, filter]);

  async function submit(exercise: Exercise) {
    const answer = selected[exercise.id];
    if (!answer) return;
    const result = await apiFetch<Result>(`/exercises/${exercise.id}/submit`, {
      method: "POST",
      body: JSON.stringify({ selected_answer: answer }),
    });
    setResults((current) => ({ ...current, [exercise.id]: result }));
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <LoadingCard />
        <LoadingCard />
      </div>
    );
  }

  return (
    <MotionShell className="space-y-6">
      <PageHeader
        eyebrow="Treino adaptativo"
        title="Quests de Linguagens"
        description="Questoes objetivas com feedback rapido, XP e ajuste de dificuldade."
        action={
          <div className="flex w-full items-center gap-2 md:w-auto">
            <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList>
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="easy">Facil</TabsTrigger>
                <TabsTrigger value="medium">Medio</TabsTrigger>
                <TabsTrigger value="hard">Dificil</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-2">
        {filtered.map((exercise) => {
          const result = results[exercise.id];
          return (
            <Surface key={exercise.id}>
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between">
                  <Badge>{exercise.skill}</Badge>
                  <Badge variant="outline">{exercise.difficulty}</Badge>
                </div>
                <h2 className="text-base font-black leading-6 tracking-normal">{exercise.statement}</h2>
              </div>
              <div className="space-y-3">
                {exercise.options.map((option) => {
                  const letter = option.slice(0, 1);
                  const active = selected[exercise.id] === letter;
                  const isCorrect = result?.correct_answer === letter;
                  const isWrong = result?.selected_answer === letter && !result?.is_correct;
                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={Boolean(result)}
                      onClick={() => setSelected((current) => ({ ...current, [exercise.id]: letter }))}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-md border p-3 text-left text-sm transition-colors hover:bg-muted",
                        active && "border-primary bg-primary/5",
                        isCorrect && "border-accent bg-accent/10",
                        isWrong && "border-destructive bg-destructive/10",
                      )}
                    >
                      {isCorrect ? <CheckCircle2 className="h-4 w-4 text-accent" /> : isWrong ? <XCircle className="h-4 w-4 text-destructive" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                      <span>{option}</span>
                    </button>
                  );
                })}
                {result ? (
                  <div className="rounded-md border bg-muted/45 p-3 text-sm leading-6">
                    <p className="font-semibold">{result.is_correct ? `Correto +${result.xp_earned} XP` : "Revise este ponto"}</p>
                    <p className="mt-1 text-muted-foreground">{result.explanation}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Proxima dificuldade sugerida: {result.next_difficulty}</p>
                  </div>
                ) : (
                  <Button onClick={() => submit(exercise)} disabled={!selected[exercise.id]}>
                    Corrigir
                  </Button>
                )}
              </div>
            </Surface>
          );
        })}
      </div>
    </MotionShell>
  );
}
