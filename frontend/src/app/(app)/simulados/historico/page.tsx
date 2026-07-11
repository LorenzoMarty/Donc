"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Trophy } from "lucide-react";

import { LoadingCard } from "@/components/shared/loading-card";
import { MotionShell } from "@/components/shared/motion-shell";
import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiFetch, type MockExamAttemptSummary } from "@/services/api";

export default function ExamHistoryPage() {
  const [attempts, setAttempts] = useState<MockExamAttemptSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<MockExamAttemptSummary[]>("/exams/attempts")
      .then(setAttempts)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingCard />;

  return (
    <MotionShell className="space-y-6">
      <PageHeader
        eyebrow="Arena ENEM"
        title="Histórico de simulados"
        description="Suas tentativas anteriores, com nota e acertos por simulado."
        action={
          <Button variant="outline" asChild>
            <Link href="/simulados">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Voltar
            </Link>
          </Button>
        }
      />

      {attempts.length === 0 ? (
        <Surface className="p-6 text-sm text-muted-foreground">Nenhuma tentativa registrada ainda.</Surface>
      ) : (
        <div className="space-y-3">
          {attempts.map((attempt) => (
            <Surface key={attempt.attempt_id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <h2 className="text-sm font-semibold leading-6">{attempt.exam_title}</h2>
                <p className="text-xs text-muted-foreground">
                  {attempt.correct_answers}/{attempt.total_questions} acertos
                  {attempt.finished_at ? ` · ${new Date(attempt.finished_at).toLocaleDateString("pt-BR")}` : ""}
                </p>
              </div>
              <Badge className="flex items-center gap-1 text-sm font-semibold">
                <Trophy className="h-4 w-4 text-primary" aria-hidden="true" />
                {attempt.score}%
              </Badge>
            </Surface>
          ))}
        </div>
      )}
    </MotionShell>
  );
}
