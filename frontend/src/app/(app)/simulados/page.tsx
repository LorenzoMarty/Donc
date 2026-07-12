"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, History, Play, Trophy, XCircle } from "lucide-react";

import { ErrorState } from "@/components/shared/error-state";
import { LoadingCard } from "@/components/shared/loading-card";
import { MotionShell } from "@/components/shared/motion-shell";
import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { apiFetch, type MockExam, type MockExamSubmitResult } from "@/services/api";
import { useTrackEvent } from "@/hooks/use-track-event";

export default function ExamsPage() {
  const [exams, setExams] = useState<MockExam[]>([]);
  const [active, setActive] = useState<MockExam | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<MockExamSubmitResult | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const trackEvent = useTrackEvent();

  const loadExams = useCallback(() => {
    return apiFetch<MockExam[]>("/exams")
      .then((data) => {
        setExams(data);
        setLoadError("");
      })
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : "Não foi possível carregar os simulados."))
      .finally(() => setLoading(false));
  }, []);

  function retryLoadExams() {
    setLoading(true);
    setLoadError("");
    loadExams();
  }

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  useEffect(() => {
    if (!active || result) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [active, result]);

  const elapsed = useMemo(() => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`, [seconds]);

  async function submit() {
    if (!active) return;
    const payload = await apiFetch<MockExamSubmitResult>(`/exams/${active.id}/submit`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    });
    setResult(payload);
    trackEvent({
      event_type: "exam_submitted",
      entity_id: String(active.id),
      entity_type: "exam",
      duration_ms: seconds * 1000,
      meta: { score: payload.score },
    });
  }

  if (loadError) return <ErrorState description={loadError} onRetry={retryLoadExams} />;
  if (loading) return <LoadingCard />;

  return (
    <MotionShell className="space-y-6">
      <PageHeader
        eyebrow="Arena ENEM"
        title="Simulado cronometrado"
        description="Questões de Linguagens em blocos rápidos. Veja seu desempenho por habilidade ao final."
        action={
          active ? (
            <div className="game-chip flex w-full items-center justify-center gap-2 bg-card/82 px-4 py-3 text-sm font-semibold md:w-auto">
              <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
              {elapsed}
            </div>
          ) : (
            <Button variant="outline" asChild>
              <Link href="/simulados/historico">
                <History className="h-4 w-4" aria-hidden="true" />
                Histórico
              </Link>
            </Button>
          )
        }
      />

      {!active ? (
        <div className="fluid-grid gap-4 [--grid-min:17rem]">
          {exams.map((exam) => (
            <Surface key={exam.id}>
              <div className="mb-4">
                <h2 className="text-xl font-semibold tracking-normal">{exam.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{exam.description}</p>
              </div>
              <div className="space-y-4">
                <div className="game-tile flex items-center justify-between bg-background/58 p-3 text-sm font-semibold">
                  <span>{exam.area}</span>
                  <span>{exam.duration_minutes} min</span>
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    setActive(exam);
                    setSeconds(0);
                    setResult(null);
                    setAnswers({});
                    trackEvent({ event_type: "exam_started", entity_id: String(exam.id), entity_type: "exam" });
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
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,20rem)]">
          <div className="space-y-4">
            {active.questions.map((question, index) => {
              const review = result?.questions.find((entry) => entry.id === question.id);
              return (
                <Surface key={question.id}>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <Badge>{question.skill}</Badge>
                      <h2 className="mt-3 text-base font-semibold leading-6 tracking-normal">
                        {index + 1}. {question.statement}
                      </h2>
                    </div>
                    {review ? (
                      review.correct ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                      ) : (
                        <XCircle className="h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
                      )
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    {question.options.map((option) => {
                      const letter = option.slice(0, 1);
                      const isSelected = answers[String(question.id)] === letter;
                      const isCorrectOption = review && letter === review.correct_answer;
                      const isWrongSelected = review && isSelected && !review.correct;
                      return (
                        <button
                          key={option}
                          type="button"
                          disabled={Boolean(result)}
                          onClick={() => setAnswers((current) => ({ ...current, [String(question.id)]: letter }))}
                          className={`game-tile min-h-11 w-full bg-background/58 p-3 text-left text-sm font-medium transition-colors hover:bg-muted/60 ${
                            isCorrectOption
                              ? "bg-success/20"
                              : isWrongSelected
                                ? "bg-destructive/20"
                                : isSelected
                                  ? "bg-primary/20"
                                  : ""
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                  {review ? (
                    <p className="mt-3 text-sm text-muted-foreground">{review.explanation}</p>
                  ) : null}
                </Surface>
              );
            })}
          </div>
          <Surface className="h-fit">
            <div className="mb-4">
              <h2 className="text-xl font-semibold tracking-normal">Resumo</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {Object.keys(answers).length}/{active.questions.length} respondidas
              </p>
            </div>
            <div className="space-y-4">
              {result ? (
                <>
                  <div className="game-tile bg-primary/10 p-4 text-center">
                    <Trophy className="mx-auto mb-2 h-6 w-6 text-primary" aria-hidden="true" />
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
