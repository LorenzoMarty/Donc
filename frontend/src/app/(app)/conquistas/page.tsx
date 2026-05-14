"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Crown, Gem, Medal, Trophy } from "lucide-react";

import {
  AchievementCard,
  PlatinumAchievement,
  TrophyShowcase,
  XPRewardModal,
  achievementCategories,
  buildAchievements,
  type AchievementMetrics,
  type AchievementProgress,
} from "@/components/game/achievements-system";
import { LoadingCard } from "@/components/shared/loading-card";
import { PageHeader, Surface } from "@/components/shared/premium-ui";
import { useAuth } from "@/providers/app-providers";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch, type EssayHistory, type Exercise } from "@/services/api";

const completedNodeStorageKey = "donk.exercise.completed.nodes";
const connectiveStorageKey = "donk.essay.lab.connective.wins";
const puzzleStorageKey = "donk.essay.lab.puzzle.wins";
const argumentStorageKey = "donk.essay.lab.argument.wins";
const seenStorageKey = "donk.achievements.seen";
const trackIds = ["interpretacao", "gramatica", "redacao"];

export default function AchievementsPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState<EssayHistory | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [completedNodeIds, setCompletedNodeIds] = useState<string[]>([]);
  const [connectiveWins, setConnectiveWins] = useState(0);
  const [puzzleWins, setPuzzleWins] = useState(0);
  const [argumentWins, setArgumentWins] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reward, setReward] = useState<AchievementProgress | null>(null);
  const [rewardChecked, setRewardChecked] = useState(false);

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
      apiFetch<EssayHistory>("/essays/history").then(setHistory).catch(() => setHistory({ essays: [], average_score: 0, weakest_competency: "C1", recurrent_errors: [], evolution: [] })),
      apiFetch<Exercise[]>("/exercises").then(setExercises).catch(() => setExercises([])),
    ]).finally(() => setLoading(false));

    return () => window.removeEventListener("storage", readLocalProgress);
  }, []);

  const metrics = useMemo<AchievementMetrics>(() => {
    const essays = history?.essays ?? [];
    const scores = essays.map((essay) => essay.score ?? 0).filter(Boolean);
    const completedTracks = trackIds.filter((trackId) => completedNodeIds.some((nodeId) => nodeId.startsWith(`${trackId}-boss-boss`))).length;

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
  const platinum = achievements.find((achievement) => achievement.rarity === "platina") ?? achievements[achievements.length - 1];
  const regularAchievements = achievements.filter((achievement) => achievement.rarity !== "platina");

  useEffect(() => {
    if (loading || rewardChecked || !achievements.length) return;
    const seen = new Set(readStringArray(seenStorageKey));
    const candidate =
      achievements.find((achievement) => achievement.unlocked && !seen.has(achievement.id) && achievement.rarity !== "comum") ??
      achievements.find((achievement) => achievement.unlocked && !seen.has(achievement.id));
    if (candidate) setReward(candidate);
    setRewardChecked(true);
  }, [achievements, loading, rewardChecked]);

  function closeReward() {
    if (reward) {
      const seen = new Set(readStringArray(seenStorageKey));
      seen.add(reward.id);
      window.localStorage.setItem(seenStorageKey, JSON.stringify(Array.from(seen)));
    }
    setReward(null);
  }

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
        eyebrow="Conquistas"
        title="Platine sua evolução"
        description="Uma coleção de troféus para registrar constância, domínio de redação, progresso nas trilhas e desafios secretos."
        action={
          <Button asChild size="lg" className="w-full md:w-auto">
            <Link href="/redacao">
              Evoluir redação
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      <TrophyShowcase achievements={achievements} level={user.level} streak={user.streak_days} />
      {platinum && <PlatinumAchievement achievement={platinum} />}

      <div className="grid gap-4 md:grid-cols-3">
        <Surface>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-muted-foreground">Perfil</p>
              <h2 className="mt-1 text-xl font-black tracking-normal">{user.name}</h2>
            </div>
            <Medal className="h-5 w-5 text-secondary" aria-hidden="true" />
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Nível {user.level}, {user.xp} XP e {user.streak_days} dias de sequência.</p>
        </Surface>
        <Surface>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-muted-foreground">Redação</p>
              <h2 className="mt-1 text-xl font-black tracking-normal">{metrics.bestEssayScore || "Sem nota"}</h2>
            </div>
            <Crown className="h-5 w-5 text-secondary" aria-hidden="true" />
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Melhor nota registrada e {metrics.essaysWritten} textos no histórico.</p>
        </Surface>
        <Surface>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-muted-foreground">Laboratório</p>
              <h2 className="mt-1 text-xl font-black tracking-normal">{connectiveWins + puzzleWins + argumentWins} vitórias</h2>
            </div>
            <Gem className="h-5 w-5 text-secondary" aria-hidden="true" />
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Conectivos, encaixes e argumentação alimentam troféus de domínio.</p>
        </Surface>
      </div>

      <Tabs defaultValue="todos" className="space-y-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto bg-muted/72 p-1 no-scrollbar">
          <TabsTrigger value="todos" className="gap-2">
            <Trophy className="h-4 w-4" aria-hidden="true" />
            Todos
          </TabsTrigger>
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

      <XPRewardModal
        open={Boolean(reward)}
        title={reward?.title ?? "Conquista desbloqueada"}
        description={reward?.description ?? "Nova recompensa adicionada ao seu perfil."}
        xp={reward?.xp ?? 0}
        rarity={reward?.rarity ?? "rara"}
        actionLabel="Adicionar à coleção"
        onClose={closeReward}
      />
    </div>
  );
}

function AchievementGrid({ achievements }: { achievements: AchievementProgress[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {achievements.map((achievement, index) => (
        <AchievementCard key={achievement.id} achievement={achievement} index={index} />
      ))}
    </div>
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
