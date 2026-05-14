"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpenCheck, Flame, LineChart, PenLine, Target, Trophy, Zap } from "lucide-react";

import { ScoreAreaChart } from "@/components/app/charts";
import { LoadingCard } from "@/components/app/loading-card";
import { AchievementChip, PageHeader, RankPodium, StatTile, StreakStrip, Surface, XpRing } from "@/components/app/premium-ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { apiFetch, type Dashboard } from "@/lib/api";

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);

  useEffect(() => {
    apiFetch<Dashboard>("/dashboard").then(setData);
  }, []);

  const xpProgress = useMemo(() => {
    if (!data) return 0;
    return data.xp % 250 ? ((data.xp % 250) / 250) * 100 : 100;
  }, [data]);

  if (!data) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <LoadingCard />
        <LoadingCard />
        <LoadingCard />
        <LoadingCard />
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        eyebrow="Central de progresso"
        title="Seu mapa de evolucao"
        description="Aulas, redacoes, simulados e metas em um fluxo rapido, visual e consistente."
        action={
          <Button asChild size="lg" className="w-full md:w-auto">
            <Link href="/redacao">
              Escrever agora
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <XpRing level={data.level} xp={data.xp} progress={xpProgress} />

        <Surface className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase text-muted-foreground">Streak</p>
              <p className="mt-1 text-3xl font-black tracking-normal">{data.streak_days} dias</p>
            </div>
            <div className="rounded-lg bg-secondary/18 p-3 text-secondary">
              <Flame className="h-6 w-6" aria-hidden="true" />
            </div>
          </div>
          <StreakStrip days={data.streak_days} />
          <div className="rounded-lg border bg-background/56 p-3">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-bold">Meta diaria</span>
              <span className="font-black text-secondary">{data.goals[0]?.current ?? 0}/{data.goals[0]?.target ?? 45}</span>
            </div>
            <Progress value={data.goals[0] ? Math.min(100, (data.goals[0].current / data.goals[0].target) * 100) : 0} />
          </div>
        </Surface>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Progresso" value={`${data.progress_general}%`} helper="Trilhas e pratica" progress={data.progress_general} icon={LineChart} />
        <StatTile label="Redacao" value={`${data.essay_average}`} helper={`${data.essays_written} textos no historico`} progress={data.essay_average / 10} icon={PenLine} tone="gold" />
        <StatTile label="Precisao" value={`${data.correct_exercises_rate}%`} helper="Acertos em exercicios" progress={data.correct_exercises_rate} icon={Target} tone="accent" />
        <StatTile label="Aulas" value={`${data.completed_lessons}`} helper="Concluidas na trilha" progress={Math.min(data.completed_lessons * 12, 100)} icon={BookOpenCheck} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_0.55fr]">
        <Surface className="min-h-[360px]">
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-black uppercase text-muted-foreground">Score tracker</p>
              <h2 className="mt-1 text-xl font-black tracking-normal">Evolucao das redacoes</h2>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-md bg-accent/12 px-3 py-2 text-xs font-black text-accent">
              <Zap className="h-3.5 w-3.5" aria-hidden="true" />
              Coach IA ativo
            </div>
          </div>
          <ScoreAreaChart data={data.trend} />
        </Surface>

        <Surface className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase text-muted-foreground">Ranking</p>
              <h2 className="mt-1 text-xl font-black tracking-normal">Liga semanal</h2>
            </div>
            <Trophy className="h-5 w-5 text-secondary" aria-hidden="true" />
          </div>
          <RankPodium xp={data.xp} />
        </Surface>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Surface>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-black tracking-normal">Aulas recentes</h2>
            <BookOpenCheck className="h-5 w-5 text-secondary" aria-hidden="true" />
          </div>
          <div className="space-y-3">
            {data.recent_lessons.map((lesson) => (
              <Link key={lesson.id} href={`/aulas/${lesson.id}`} className="block rounded-lg border bg-background/54 p-3 transition-colors hover:bg-muted/70">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-bold">{lesson.title}</p>
                  <span className="text-xs font-black text-secondary">{lesson.progress_percent}%</span>
                </div>
                <p className="mb-3 truncate text-xs text-muted-foreground">{lesson.module}</p>
                <Progress value={lesson.progress_percent} />
              </Link>
            ))}
          </div>
        </Surface>

        <Surface>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-black tracking-normal">Quests</h2>
            <Target className="h-5 w-5 text-secondary" aria-hidden="true" />
          </div>
          <div className="space-y-3">
            {data.pending_exercises.map((exercise) => (
              <Link key={exercise.id} href="/exercicios" className="flex items-center justify-between gap-3 rounded-lg border bg-background/54 p-3 transition-colors hover:bg-muted/70">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{exercise.skill}</p>
                  <p className="text-xs text-muted-foreground">Dificuldade {exercise.difficulty}</p>
                </div>
                <div className="rounded-md bg-primary/10 px-2 py-1 text-xs font-black text-primary">+18 XP</div>
              </Link>
            ))}
          </div>
        </Surface>

        <Surface>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-black tracking-normal">Conquistas</h2>
            <Trophy className="h-5 w-5 text-secondary" aria-hidden="true" />
          </div>
          <div className="space-y-3">
            {data.achievements.map((achievement, index) => (
              <AchievementChip key={achievement.id} title={achievement.title} description={achievement.description} index={index} />
            ))}
          </div>
        </Surface>
      </div>
    </div>
  );
}

