"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Award, BadgeCheck, BarChart3, CalendarCheck, ChevronRight, Clock3, Flame, Gauge, History, Medal, Sparkles, Target, Trophy, Zap } from "lucide-react";

import { getGameById } from "@/features/gamification/catalog";
import type { BadgeDefinition, GameAttempt, GameCategory } from "@/features/gamification/types";
import { buildProgressionSnapshot, getNextBadges, type WeeklyGoal } from "@/features/progression/progression";
import { getLocalRanking } from "@/features/ranking/ranking";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useGameStore } from "@/stores/game-store";
import { cn } from "@/utils";

export function ProgressionDashboard() {
  const xp = useGameStore((state) => state.xp);
  const attempts = useGameStore((state) => state.attempts);
  const progress = useGameStore((state) => state.progress);
  const badges = useGameStore((state) => state.badges);
  const streak = useGameStore((state) => state.streak);
  const [showConfetti, setShowConfetti] = useState(false);
  const previousBadgeCount = useRef<number | null>(null);

  const snapshot = useMemo(
    () =>
      buildProgressionSnapshot({
        xp,
        attempts,
        progress,
        badgeIds: badges,
      }),
    [attempts, badges, progress, xp],
  );
  const nextBadges = getNextBadges(snapshot.unlockedBadges, 4);
  const ranking = getLocalRanking(xp);
  const completedGoals = snapshot.weeklyGoals.filter((goal) => goal.completed).length;

  useEffect(() => {
    if (previousBadgeCount.current === null) {
      previousBadgeCount.current = badges.length;
      return;
    }

    if (badges.length > previousBadgeCount.current) {
      setShowConfetti(true);
      const timer = window.setTimeout(() => setShowConfetti(false), 1300);
      previousBadgeCount.current = badges.length;
      return () => window.clearTimeout(timer);
    }

    previousBadgeCount.current = badges.length;
    return undefined;
  }, [badges.length]);

  return (
    <motion.section
      id="progressao"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="game-surface relative overflow-hidden bg-card p-4 text-foreground md:p-5"
    >
      <ProgressionConfetti active={showConfetti} />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/75 to-transparent" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-24 top-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />

      <div className="relative mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="game-chip inline-flex items-center gap-2 bg-primary/12 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Sistema de progressao
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-normal text-foreground md:text-3xl">Evolucao real do treino</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            XP, ranks, metas, badges e historico aparecem como reforco de consistencia. O foco continua sendo dominio, precisao e rotina.
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-4">
          <MiniMetric icon={<Zap className="h-4 w-4" aria-hidden="true" />} label="XP" value={String(xp)} />
          <MiniMetric icon={<Flame className="h-4 w-4" aria-hidden="true" />} label="Streak" value={`${streak.current}d`} />
          <MiniMetric icon={<Award className="h-4 w-4" aria-hidden="true" />} label="Badges" value={String(snapshot.unlockedBadges.length)} />
          <MiniMetric icon={<Target className="h-4 w-4" aria-hidden="true" />} label="Metas" value={`${completedGoals}/4`} />
        </div>
      </div>

      <div className="relative grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.75fr)]">
        <main className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,.85fr)]">
            <RankCard rank={snapshot.rank} />
            <WeeklyEvolution days={snapshot.weekly.days} weeklyXp={snapshot.weekly.xp} averageAccuracy={snapshot.weekly.averageAccuracy} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <WeeklyGoals goals={snapshot.weeklyGoals} />
            <CategoryMastery categories={snapshot.categories} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <FavoriteGames favorites={snapshot.favorites} />
            <PerformancePanel
              sessions={snapshot.performance.sessions}
              completedGames={snapshot.performance.completedGames}
              dominatedGames={snapshot.performance.dominatedGames}
              averageAccuracy={snapshot.performance.averageAccuracy}
              averageDuration={snapshot.performance.averageDuration}
            />
          </div>
        </main>

        <aside className="space-y-4">
          <BadgePanel unlocked={snapshot.unlockedBadges} next={nextBadges} />
          <LeaguePanel ranking={ranking} />
          <HistoryPanel attempts={snapshot.history} />
        </aside>
      </div>
    </motion.section>
  );
}

function RankCard({ rank }: { rank: ReturnType<typeof buildProgressionSnapshot>["rank"] }) {
  return (
    <motion.div whileHover={{ y: -3 }} className="game-tile relative overflow-hidden bg-background/58 p-4">
      <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-primary/12 blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Rank atual</p>
          <h3 className="mt-2 text-3xl font-semibold tracking-normal text-foreground">{rank.current.name}</h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{rank.current.description}</p>
        </div>
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-md border border-primary/30 bg-primary/12 text-secondary">
          <Trophy className="h-8 w-8" aria-hidden="true" />
        </div>
      </div>

      <div className="relative mt-6">
        <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold">
          <span className="uppercase tracking-[0.16em] text-primary">Nivel</span>
          <span className="text-muted-foreground">{rank.next ? `${rank.xpToNext} XP ate ${rank.next.name}` : "Rank maximo"}</span>
        </div>
        <AnimatedBar value={rank.progress} />
        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>{rank.current.name}</span>
          <span>{rank.next?.name ?? "Topo"}</span>
        </div>
      </div>
    </motion.div>
  );
}

function WeeklyEvolution({
  days,
  weeklyXp,
  averageAccuracy,
}: {
  days: ReturnType<typeof buildProgressionSnapshot>["weekly"]["days"];
  weeklyXp: number;
  averageAccuracy: number;
}) {
  const maxSessions = Math.max(1, ...days.map((day) => day.sessions));

  return (
    <div className="game-tile bg-background/58 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Evolucao semanal</p>
          <h3 className="mt-2 text-xl font-semibold tracking-normal text-foreground">{weeklyXp} XP nesta semana</h3>
        </div>
        <Badge className="border-primary/20 bg-primary/12 text-secondary">{averageAccuracy}% precisao</Badge>
      </div>

      <div className="mt-5 grid grid-cols-7 items-end gap-2">
        {days.map((day, index) => {
          const height = 18 + (day.sessions / maxSessions) * 78;
          return (
            <div key={day.key} className="flex min-w-0 flex-col items-center gap-2">
              <div className="flex h-28 w-full items-end rounded-md border border-border bg-card/70 px-1.5 pb-1.5">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height }}
                  transition={{ delay: index * 0.04, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  className={cn("w-full rounded-md", day.sessions > 0 ? "bg-gradient-to-t from-primary/75 to-accent" : "bg-muted/70")}
                />
              </div>
              <span className="truncate text-[0.68rem] font-semibold uppercase text-muted-foreground">{day.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeeklyGoals({ goals }: { goals: WeeklyGoal[] }) {
  return (
    <DashboardPanel title="Metas semanais" icon={<CalendarCheck className="h-4 w-4" aria-hidden="true" />}>
      <div className="grid gap-3">
        {goals.map((goal, index) => (
          <motion.div
            key={goal.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.28 }}
            className="game-tile bg-background/58 p-3"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{goal.label}</p>
                <p className="text-xs text-muted-foreground">
                  {goal.current}/{goal.target} {goal.unit}
                </p>
              </div>
              {goal.completed ? (
                <Badge className="border-primary/25 bg-primary/12 text-secondary">Completa</Badge>
              ) : (
                <span className="text-xs font-semibold text-muted-foreground">{goal.progress}%</span>
              )}
            </div>
            <Progress value={goal.progress} className="h-2" />
          </motion.div>
        ))}
      </div>
    </DashboardPanel>
  );
}

function CategoryMastery({ categories }: { categories: GameCategory[] }) {
  return (
    <DashboardPanel title="Categorias dominadas" icon={<Gauge className="h-4 w-4" aria-hidden="true" />}>
      <div className="space-y-3">
        {categories.slice(0, 5).map((category) => {
          const Icon = category.icon;
          return (
            <Link
              key={category.id}
              href={`/games/${category.slug}`}
              className="game-tile group block bg-background/58 p-3 transition-all duration-300 hover:bg-muted/62"
            >
              <div className="mb-2 flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-md border border-primary/25 bg-primary/12 text-secondary">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{category.name}</p>
                  <p className="text-xs text-muted-foreground">{category.masteryLevel}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-secondary" aria-hidden="true" />
              </div>
              <AnimatedBar value={category.progress} compact />
            </Link>
          );
        })}
      </div>
    </DashboardPanel>
  );
}

function FavoriteGames({ favorites }: { favorites: ReturnType<typeof buildProgressionSnapshot>["favorites"] }) {
  return (
    <DashboardPanel title="Jogos favoritos" icon={<Medal className="h-4 w-4" aria-hidden="true" />}>
      {favorites.length ? (
        <div className="space-y-3">
          {favorites.map((favorite) => {
            const game = favorite.game;
            if (!game) return null;
            return (
              <Link
                key={favorite.gameId}
                href={`/games/${game.category}/${game.id}`}
                className="game-tile block bg-background/58 p-3 transition-all duration-300 hover:bg-muted/62"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{game.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{favorite.sessions} sessoes</p>
                  </div>
                  <Badge className="border-primary/20 bg-primary/12 text-secondary">{favorite.bestAccuracy}%</Badge>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyPanel
          icon={<Sparkles className="h-5 w-5" aria-hidden="true" />}
          title="Nenhum favorito ainda"
          description="Jogue algumas sessoes para o hub detectar seus treinos mais recorrentes."
          href="/games/coesao"
        />
      )}
    </DashboardPanel>
  );
}

function PerformancePanel({
  sessions,
  completedGames,
  dominatedGames,
  averageAccuracy,
  averageDuration,
}: {
  sessions: number;
  completedGames: number;
  dominatedGames: number;
  averageAccuracy: number;
  averageDuration: number;
}) {
  const metrics = [
    { label: "Sessoes", value: sessions, icon: BarChart3 },
    { label: "Jogos vistos", value: completedGames, icon: BadgeCheck },
    { label: "Dominados", value: dominatedGames, icon: Target },
    { label: "Duracao media", value: formatDuration(averageDuration), icon: Clock3 },
  ];

  return (
    <DashboardPanel title="Desempenho" icon={<BarChart3 className="h-4 w-4" aria-hidden="true" />}>
      <div className="grid grid-cols-2 gap-2">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="game-tile bg-background/58 p-3">
              <p className="flex items-center gap-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <Icon className="h-3.5 w-3.5 text-secondary" aria-hidden="true" />
                {metric.label}
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">{metric.value}</p>
            </div>
          );
        })}
      </div>
      <div className="game-tile mt-3 bg-background/58 p-3">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold">
          <span className="uppercase tracking-[0.14em] text-muted-foreground">Precisao media</span>
          <span className="text-secondary">{averageAccuracy}%</span>
        </div>
        <AnimatedBar value={averageAccuracy} compact />
      </div>
    </DashboardPanel>
  );
}

function BadgePanel({ unlocked, next }: { unlocked: BadgeDefinition[]; next: BadgeDefinition[] }) {
  const visibleUnlocked = unlocked.slice(0, 5);

  return (
    <DashboardPanel title="Conquistas" icon={<Award className="h-4 w-4" aria-hidden="true" />}>
      <div className="space-y-3">
        {visibleUnlocked.length ? (
          visibleUnlocked.map((badge) => <BadgeRow key={badge.id} badge={badge} />)
        ) : (
          <p className="game-tile bg-background/58 p-3 text-sm leading-6 text-muted-foreground">
            Suas conquistas aparecem aqui depois das primeiras sessoes.
          </p>
        )}
      </div>
      <div className="mt-4 border-t border-border pt-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Proximas badges</p>
        <div className="space-y-2">
          {next.map((badge) => (
            <BadgeRow key={badge.id} badge={badge} locked />
          ))}
        </div>
      </div>
    </DashboardPanel>
  );
}

function BadgeRow({ badge, locked = false }: { badge: BadgeDefinition; locked?: boolean }) {
  const Icon = badge.icon;
  const rarity = rarityMeta[badge.rarity];

  return (
    <div className={cn("game-tile flex items-start gap-3 p-3", locked ? "bg-background/50 opacity-70" : "bg-primary/8")}>
      <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-md border", locked ? "border-border bg-muted/60 text-muted-foreground" : "border-primary/25 bg-primary/12 text-secondary")}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{badge.name}</p>
          <span className={cn("rounded-full border px-2 py-0.5 text-[0.66rem] font-semibold uppercase tracking-[0.12em]", rarity.className)}>{rarity.label}</span>
        </div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{badge.description}</p>
      </div>
    </div>
  );
}

function LeaguePanel({ ranking }: { ranking: ReturnType<typeof getLocalRanking> }) {
  return (
    <DashboardPanel title="Ranking" icon={<Trophy className="h-4 w-4" aria-hidden="true" />}>
      <div className="space-y-2">
        {ranking.map((item, index) => (
          <div key={item.name} className={cn("game-tile flex items-center gap-3 p-3", item.name === "Voce" ? "bg-primary/10" : "bg-background/58")}>
            <div className="grid h-8 w-8 place-items-center rounded-md border border-primary/25 bg-primary/12 text-sm font-semibold text-secondary">{index + 1}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
            <p className="text-sm font-semibold text-secondary">{item.score}</p>
          </div>
        ))}
      </div>
    </DashboardPanel>
  );
}

function HistoryPanel({ attempts }: { attempts: GameAttempt[] }) {
  return (
    <DashboardPanel title="Historico" icon={<History className="h-4 w-4" aria-hidden="true" />}>
      {attempts.length ? (
        <div className="space-y-2">
          {attempts.map((attempt) => {
            const game = getGameById(attempt.gameId);
            return (
              <div key={attempt.id} className="game-tile bg-background/58 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{game?.name ?? "Treino"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatAttemptDate(attempt.playedAt)}</p>
                  </div>
                  <Badge className="border-primary/20 bg-primary/12 text-secondary">+{attempt.xpEarned}</Badge>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{attempt.accuracy}% precisao</span>
                  <span>{formatDuration(attempt.durationSeconds)}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyPanel
          icon={<History className="h-5 w-5" aria-hidden="true" />}
          title="Sem sessoes registradas"
          description="Conclua um jogo para criar historico, ranking pessoal e progresso real."
          href="/games/estrutura/essay-assembly"
        />
      )}
    </DashboardPanel>
  );
}

function DashboardPanel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="game-tile bg-background/58 p-4">
      <div className="mb-4 flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-md border border-primary/25 bg-primary/12 text-secondary">{icon}</div>
        <h3 className="text-lg font-semibold tracking-normal text-foreground">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function EmptyPanel({ icon, title, description, href }: { icon: React.ReactNode; title: string; description: string; href: string }) {
  return (
    <div className="game-tile border-dashed bg-background/50 p-4 text-center">
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-md border border-primary/20 bg-primary/12 text-secondary">{icon}</div>
      <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      <Button asChild size="sm" className="mt-4">
        <Link href={href}>Comecar treino</Link>
      </Button>
    </div>
  );
}

function MiniMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="game-tile bg-background/58 px-3 py-2">
      <p className="flex items-center gap-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <span className="text-secondary">{icon}</span>
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function AnimatedBar({ value, compact = false }: { value: number; compact?: boolean }) {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("relative overflow-hidden rounded-full border border-border bg-muted/70", compact ? "h-2" : "h-3")}>
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: `${safeValue}%` }}
        viewport={{ once: true, amount: 0.45 }}
        transition={{ duration: compact ? 0.65 : 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="relative h-full rounded-full bg-gradient-to-r from-primary via-yellow-200 to-primary"
        style={{ filter: "drop-shadow(0 0 10px hsl(var(--primary) / 0.28))" }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,.55),transparent)] opacity-60" />
      </motion.div>
    </div>
  );
}

function ProgressionConfetti({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden="true">
          {confettiPieces.map((piece, index) => (
            <motion.span
              key={`${piece.left}-${piece.delay}`}
              initial={{ opacity: 0, y: -12, rotate: 0 }}
              animate={{ opacity: [0, 1, 0], y: 150 + piece.travel, rotate: piece.rotate }}
              exit={{ opacity: 0 }}
              transition={{ delay: piece.delay, duration: 1.15, ease: "easeOut" }}
              className={cn("absolute top-0 h-2 w-1 rounded-full", index % 3 === 0 ? "bg-primary" : index % 3 === 1 ? "bg-yellow-100" : "bg-zinc-100")}
              style={{ left: `${piece.left}%` }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function formatAttemptDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

const rarityMeta: Record<BadgeDefinition["rarity"], { label: string; className: string }> = {
  comum: { label: "Bronze", className: "border-amber-500/20 bg-amber-500/10 text-amber-300" },
  raro: { label: "Prata", className: "border-border bg-muted/70 text-muted-foreground" },
  epico: { label: "Ouro", className: "border-primary/25 bg-primary/10 text-primary" },
  lendario: { label: "Diamante", className: "border-secondary/20 bg-secondary/10 text-secondary" },
};

const confettiPieces = [
  { left: 8, delay: 0.03, travel: 18, rotate: 90 },
  { left: 15, delay: 0.08, travel: 36, rotate: -120 },
  { left: 24, delay: 0.01, travel: 26, rotate: 160 },
  { left: 36, delay: 0.12, travel: 44, rotate: -160 },
  { left: 48, delay: 0.05, travel: 22, rotate: 120 },
  { left: 60, delay: 0.16, travel: 38, rotate: -90 },
  { left: 72, delay: 0.09, travel: 30, rotate: 140 },
  { left: 84, delay: 0.14, travel: 42, rotate: -180 },
  { left: 92, delay: 0.07, travel: 24, rotate: 110 },
];
