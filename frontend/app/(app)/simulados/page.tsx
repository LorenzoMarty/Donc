"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, Play, Trophy } from "lucide-react";

import { LoadingCard } from "@/components/app/loading-card";
import { MotionShell } from "@/components/app/motion-shell";
import { PageHeader, Surface } from "@/components/app/premium-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { apiFetch, type MockExam } from "@/lib/api";

type SubmitResult = {
  attempt_id: number;
  score: number;
  total_questions: number;
  correct_answers: number;
  performance_by_skill: Record<string, number>;
};

export default function ExamsPage() {
  const [exams, setExams] = useState<MockExam[]>([]);
  const [active, setActive] = useState<MockExam | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<MockExam[]>("/exams")
      .then(setExams)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!active || result) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [active, result]);

  const elapsed = useMemo(() => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`, [seconds]);

  async function submit() {
    if (!active) return;
    const payload = await apiFetch<SubmitResult>(`/exams/${active.id}/submit`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    });
    setResult(payload);
  }

  if (loading) return <LoadingCard />;

  return (
    <MotionShell className="space-y-6">
      <PageHeader
        eyebrow="Arena ENEM"
        title="Simulado cronometrado"
        description="Blocos rapidos de Linguagens com desempenho por habilidade."
        action={
          active ? (
            <div className="flex w-full items-center justify-center gap-2 rounded-lg border bg-card/82 px-4 py-3 text-sm font-black shadow-sm md:w-auto">
              <Clock className="h-4 w-4 text-secondary" aria-hidden="true" />
              {elapsed}
            </div>
          ) : null
        }
      />

      {!active ? (
        <div className="grid gap-4 md:grid-cols-2">
          {exams.map((exam) => (
            <Surface key={exam.id}>
              <div className="mb-4">
                <h2 className="text-xl font-black tracking-normal">{exam.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{exam.description}</p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <span>{exam.area}</span>
                  <span>{exam.duration_minutes} min</span>
                </div>
                <Button
                  onClick={() => {
                    setActive(exam);
                    setSeconds(0);
                    setResult(null);
                    setAnswers({});
                  }}
                >
                  <Play className="h-4 w-4" aria-hidden="true" />
                  Iniciar
                </Button>
              </div>
            </Surface>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {active.questions.map((question, index) => (
              <Surface key={question.id}>
                <div className="mb-4">
                  <Badge>{question.skill}</Badge>
                  <h2 className="mt-3 text-base font-black leading-6 tracking-normal">
                    {index + 1}. {question.statement}
                  </h2>
                </div>
                <div className="space-y-2">
                  {question.options.map((option) => {
                    const letter = option.slice(0, 1);
                    return (
                      <button
                        key={option}
                        type="button"
                        disabled={Boolean(result)}
                        onClick={() => setAnswers((current) => ({ ...current, [String(question.id)]: letter }))}
                        className={`w-full rounded-md border p-3 text-left text-sm transition-colors hover:bg-muted ${answers[String(question.id)] === letter ? "border-primary bg-primary/5" : ""}`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </Surface>
            ))}
          </div>
          <Surface className="h-fit">
            <div className="mb-4">
              <h2 className="text-xl font-black tracking-normal">Resumo</h2>
              <p className="mt-1 text-sm text-muted-foreground">{Object.keys(answers).length}/{active.questions.length} respondidas</p>
            </div>
            <div className="space-y-4">
              {result ? (
                <>
                  <div className="rounded-md bg-secondary/10 p-4 text-center">
                    <Trophy className="mx-auto mb-2 h-6 w-6 text-secondary" aria-hidden="true" />
                    <p className="text-4xl font-bold tracking-normal">{result.score}%</p>
                    <p className="text-sm text-muted-foreground">{result.correct_answers} acertos</p>
                  </div>
                  {Object.entries(result.performance_by_skill).map(([skill, value]) => (
                    <div key={skill}>
                      <div className="mb-2 flex justify-between text-sm">
                        <span>{skill}</span>
                        <span>{value}%</span>
                      </div>
                      <Progress value={value} />
                    </div>
                  ))}
                </>
              ) : (
                <Button className="w-full" onClick={submit} disabled={Object.keys(answers).length === 0}>
                  Finalizar simulado
                </Button>
              )}
            </div>
          </Surface>
        </div>
      )}
    </MotionShell>
  );
}
