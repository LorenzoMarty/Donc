"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpenCheck, FilePenLine, Flame, LineChart, Medal, PenLine, Target, Trophy } from "lucide-react";

import { ScoreAreaChart } from "@/components/shared/charts";
import { LoadingCard } from "@/components/shared/loading-card";
import { AchievementChip, PageHeader, StatTile, Surface } from "@/components/shared/premium-ui";
import { AnimatedGameCard, ResponsiveHUD, SmoothProgressPath, useGsapReveal } from "@/components/shared/motion-system";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { apiFetch, type Dashboard } from "@/services/api";

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const revealRef = useGsapReveal<HTMLDivElement>();

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

  const nextLesson = data.recent_lessons[0];
  const nextExercise = data.pending_exercises[0];
  const topAchievements = data.achievements.slice(0, 3);

  return (
    <div ref={revealRef} className="space-y-5 md:space-y-6">
      <PageHeader
        eyebrow="Central de progresso"
        title="Continue de onde parou."
        description="Uma visão limpa para manter ritmo: trilha, escrita, XP e próximos passos."
        action={
          <Button asChild size="lg" className="w-full md:w-auto">
            <Link href="/exercicios">
              Jogar próxima fase
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      <div data-gsap-card>
        <ResponsiveHUD level={data.level} xp={data.xp} streak={data.streak_days} progress={xpProgress} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Surface className="min-h-[350px]">
          <div className="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-black uppercase text-muted-foreground">Trilha principal</p>
              <h2 className="mt-1 text-2xl font-black tracking-normal">Avance uma fase curta hoje</h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-muted-foreground">
                O caminho prioriza continuidade: uma fase rápida, feedback imediato e próxima etapa liberada.
              </p>
            </div>
            <div className="game-chip inline-flex w-fit items-center gap-2 bg-accent/12 px-3 py-2 text-xs font-black text-accent">
              <Flame className="h-3.5 w-3.5" aria-hidden="true" />
              {data.streak_days} dias
            </div>
          </div>
          <SmoothProgressPath progress={Math.max(18, data.correct_exercises_rate)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <AnimatedGameCard>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-muted-foreground">Próxima aula</p>
                  <h3 className="mt-1 truncate text-lg font-black">{nextLesson?.title ?? "Interpretação textual"}</h3>
                </div>
                <BookOpenCheck className="h-5 w-5 text-secondary" aria-hidden="true" />
              </div>
              <Progress value={nextLesson?.progress_percent ?? data.progress_general} />
            </AnimatedGameCard>
            <AnimatedGameCard active>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-foreground/62">Próxima fase</p>
                  <h3 className="mt-1 truncate text-lg font-black">{nextExercise?.skill ?? "Conectivos"}</h3>
                </div>
                <Target className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="text-sm font-bold text-foreground/74">+18 XP ao concluir</p>
            </AnimatedGameCard>
          </div>
        </Surface>

        <Surface className="min-h-[350px]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-muted-foreground">Evolução de escrita</p>
              <h2 className="mt-1 text-2xl font-black tracking-normal">{data.essay_average} de média</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-muted-foreground">
                {data.essays_written} redações no histórico. Continue escrevendo para estabilizar a nota.
              </p>
            </div>
            <FilePenLine className="h-6 w-6 text-secondary" aria-hidden="true" />
          </div>
          <div className="min-h-[210px]">
            <ScoreAreaChart data={data.trend} />
          </div>
          <Button asChild className="mt-4 w-full">
            <Link href="/redacao">
              Abrir folha de redação
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </Surface>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatTile label="Progresso" value={`${data.progress_general}%`} helper="Campanha geral" progress={data.progress_general} icon={LineChart} />
        <StatTile label="Precisão" value={`${data.correct_exercises_rate}%`} helper="Acertos nos jogos" progress={data.correct_exercises_rate} icon={Target} tone="accent" />
        <StatTile label="Redação" value={`${data.essay_average}`} helper="Média atual" progress={data.essay_average / 10} icon={PenLine} tone="gold" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Surface>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase text-muted-foreground">Conquistas recentes</p>
              <h2 className="mt-1 text-xl font-black tracking-normal">Coleção ativa</h2>
            </div>
            <Trophy className="h-5 w-5 text-secondary" aria-hidden="true" />
          </div>
          <div className="space-y-3">
            {topAchievements.map((achievement, index) => (
              <AchievementChip key={achievement.id} title={achievement.title} description={achievement.description} index={index} />
            ))}
          </div>
          <Button asChild variant="outline" className="mt-4 w-full">
            <Link href="/conquistas">
              Ver troféus
              <Medal className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </Surface>

        <Surface className="bg-primary text-primary-foreground">
          <div className="flex h-full flex-col justify-between gap-5">
            <div>
              <p className="text-xs font-black uppercase text-foreground/62">Foco de hoje</p>
              <h2 className="mt-2 text-3xl font-black tracking-normal">Uma fase + uma folha.</h2>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-foreground/74">
                O fluxo ideal para evoluir sem ansiedade: conclua uma fase rápida e escreva um bloco da redação.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {["1 fase", "1 parágrafo", "1 troféu"].map((item) => (
                <div key={item} className="game-tile bg-foreground/10 p-3 text-center text-xs font-black text-foreground/86">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </Surface>
      </div>
    </div>
  );
}
