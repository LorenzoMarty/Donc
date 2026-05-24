"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookOpenCheck,
  Brain,
  CheckCircle2,
  Flame,
  Gem,
  LockKeyhole,
  Medal,
  PenLine,
  ShieldCheck,
  Target,
  Trophy,
  Zap,
} from "lucide-react";

import {
  achievementCategories,
  buildAchievements,
  type AchievementMetrics,
  type AchievementProgress,
} from "@/components/game/achievements-system";
import { LoadingCard } from "@/components/shared/loading-card";
import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/providers/app-providers";
import { apiFetch, type Dashboard, type EssayHistory, type Exercise } from "@/services/api";
import { cn } from "@/utils";

const completedNodeStorageKey = "donk.exercise.completed.nodes";
const connectiveStorageKey = "donk.essay.lab.connective.wins";
const puzzleStorageKey = "donk.essay.lab.puzzle.wins";
const argumentStorageKey = "donk.essay.lab.argument.wins";
const trackIds = ["interpretacao", "gramatica", "redacao"];

const achievementIcons: Record<AchievementProgress["icon"], LucideIcon> = {
  trophy: Trophy,
  pen: PenLine,
  flame: Flame,
  target: Target,
  brain: Brain,
  crown: Medal,
  shield: ShieldCheck,
  gem: Gem,
  book: BookOpenCheck,
  zap: Zap,
};

const rarityLabel: Record<AchievementProgress["rarity"], string> = {
  comum: "Base",
  rara: "Avancado",
  epica: "Alto impacto",
  lendaria: "Dominio",
  platina: "Completo",
};

export default function AchievementsPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [history, setHistory] = useState<EssayHistory | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [completedNodeIds, setCompletedNodeIds] = useState<string[]>([]);
  const [connectiveWins, setConnectiveWins] = useState(0);
  const [puzzleWins, setPuzzleWins] = useState(0);
  const [argumentWins, setArgumentWins] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function readLocalProgress() {
      setCompletedNodeIds(readStringArray(completedNodeStorageKey));
      setConnectiveWins(readNumber(connectiveStorageKey));
      setPuzzleWins(readNumber(puzzleStorageKey));
      setArgumentWins(readNumber(argumentStorageKey));
    }

    readLocalProgress();
    window.addEventListener("storage", readLocalProgress);

    Promise.all([
      apiFetch<EssayHistory>("/essays/history")
        .then(setHistory)
        .catch(() => setHistory({ essays: [], average_score: 0, weakest_competency: "C1", recurrent_errors: [], evolution: [] })),
      apiFetch<Exercise[]>("/exercises")
        .then(setExercises)
        .catch(() => setExercises([])),
      apiFetch<Dashboard>("/dashboard")
        .then(setDashboard)
        .catch(() => setDashboard(null)),
    ]).finally(() => setLoading(false));

    return () => window.removeEventListener("storage", readLocalProgress);
  }, []);

  const metrics = useMemo<AchievementMetrics>(() => {
    const essays = history?.essays ?? [];
    const scores = essays.map((essay) => essay.score ?? 0).filter(Boolean);
    const completedTracks = trackIds.filter((trackId) =>
      completedNodeIds.some((nodeId) => nodeId.startsWith(`${trackId}-boss-boss`)),
    ).length;

    return {
      completedExercises: completedNodeIds.length,
      totalExercises: exercises.length,
      completedTracks,
      level: user?.level ?? 1,
      xp: user?.xp ?? 0,
      streakDays: user?.streak_days ?? 0,
      essaysWritten: essays.length,
      correctedEssays: essays.filter((essay) => essay.status === "corrected").length,
      bestEssayScore: scores.length ? Math.max(...scores) : 0,
      averageEssayScore: history?.average_score ?? 0,
      connectiveWins,
      puzzleWins,
      argumentWins,
    };
  }, [argumentWins, completedNodeIds, connectiveWins, exercises.length, history, puzzleWins, user?.level, user?.streak_days, user?.xp]);

  const achievements = useMemo(() => buildAchievements(metrics), [metrics]);
  const regularAchievements = achievements.filter((achievement) => achievement.rarity !== "platina");
  const unlocked = regularAchievements.filter((achievement) => achievement.unlocked);
  const completion = regularAchievements.length ? Math.round((unlocked.length / regularAchievements.length) * 100) : 0;
  const nextMilestone = regularAchievements.find((achievement) => !achievement.unlocked) ?? regularAchievements[0];

  if (loading || !user) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <LoadingCard />
        <LoadingCard />
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        eyebrow="Evolucao"
        title="Marcos de consistencia"
        description="Acompanhe conquistas como evidencias de rotina, qualidade de escrita e dominio gradual."
        action={
          <Button asChild size="lg" className="w-full md:w-auto">
            <Link href="/redacao">
              Evoluir redacao
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      <section className="grid gap-3 xs:grid-cols-2 lg:grid-cols-4">
        <Metric label="Aulas assistidas" value={String(dashboard?.completed_lessons ?? 0)} />
        <Metric label="Sequencia" value={`${user.streak_days} dias`} />
        <Metric label="Melhor nota" value={metrics.bestEssayScore ? String(metrics.bestEssayScore) : "--"} />
        <Metric label="Redacoes" value={String(metrics.essaysWritten)} />
      </section>

      <Surface>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,20rem)] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Progresso geral</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">Evolucao registrada em marcos discretos</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              O foco e manter constancia e melhorar a escrita. Pontos e raridades aparecem apenas como sinal secundario.
            </p>
            <Progress value={completion} className="mt-5 h-2.5" />
          </div>
          {nextMilestone && (
            <div className="game-tile bg-background/58 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Proximo marco</p>
              <p className="mt-2 font-semibold">{nextMilestone.title}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{nextMilestone.description}</p>
              <div className="mt-4 text-xs font-semibold text-muted-foreground">
                <span>
                  {nextMilestone.current}/{nextMilestone.target}
                </span>
              </div>
              <Progress value={nextMilestone.progress} className="mt-2 h-2" />
            </div>
          )}
        </div>
      </Surface>

      <Tabs defaultValue="todos" className="space-y-4">
        <TabsList className="mobile-scroll h-auto w-full justify-start overflow-x-auto bg-muted/72 p-1 no-scrollbar">
          <TabsTrigger value="todos">Todos</TabsTrigger>
          {achievementCategories
            .filter((category) => category.id !== "platina")
            .map((category) => (
              <TabsTrigger key={category.id} value={category.id}>
                {category.label}
              </TabsTrigger>
            ))}
        </TabsList>

        <TabsContent value="todos" className="mt-0">
          <AchievementGrid achievements={regularAchievements} />
        </TabsContent>
        {achievementCategories
          .filter((category) => category.id !== "platina")
          .map((category) => (
            <TabsContent key={category.id} value={category.id} className="mt-0">
              <AchievementGrid achievements={regularAchievements.filter((achievement) => achievement.category === category.id)} />
            </TabsContent>
          ))}
      </Tabs>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Surface className="min-h-[128px]">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-normal">{value}</p>
    </Surface>
  );
}

function AchievementGrid({ achievements }: { achievements: AchievementProgress[] }) {
  return (
    <div className="fluid-grid gap-3 [--grid-min:17rem]">
      {achievements.map((achievement) => (
        <AchievementCard key={achievement.id} achievement={achievement} />
      ))}
    </div>
  );
}

function AchievementCard({ achievement }: { achievement: AchievementProgress }) {
  const Icon = achievementIcons[achievement.icon] ?? Trophy;
  const hidden = achievement.secret && !achievement.unlocked;

  return (
    <article
      className={cn(
        "game-tile bg-background/58 p-4 transition-colors hover:bg-muted/60",
        achievement.unlocked && "border-primary/30 bg-primary/8",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-md border",
            achievement.unlocked ? "border-primary/30 bg-primary/12 text-primary" : "border-border bg-muted/50 text-muted-foreground",
          )}
        >
          {achievement.unlocked ? <Icon className="h-5 w-5" aria-hidden="true" /> : <LockKeyhole className="h-4 w-4" aria-hidden="true" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{hidden ? "Marco em progresso" : achievement.title}</h3>
            {achievement.unlocked && (
              <Badge className="border-primary/20 bg-primary/10 text-primary">
                <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden="true" />
                Concluido
              </Badge>
            )}
          </div>
          <p className="text-safe mt-2 text-sm leading-6 text-muted-foreground">
            {hidden ? "Continue estudando para revelar este marco." : achievement.description}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-xs font-semibold text-muted-foreground">
        <span>{rarityLabel[achievement.rarity]}</span>
      </div>
      <Progress value={achievement.progress} className="mt-2 h-2" />
    </article>
  );
}

function readNumber(key: string) {
  if (typeof window === "undefined") return 0;
  return Number(window.localStorage.getItem(key) ?? "0") || 0;
}

function readStringArray(key: string) {
  if (typeof window === "undefined") return [];
  const value = window.localStorage.getItem(key);
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
