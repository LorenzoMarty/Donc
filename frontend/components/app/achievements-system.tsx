"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  BookOpenCheck,
  Brain,
  CheckCircle2,
  Crown,
  Flame,
  Gem,
  Lock,
  PenLine,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  X,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type AchievementRarity = "comum" | "rara" | "epica" | "lendaria" | "platina";
export type AchievementCategory = "progressao" | "redacao" | "streak" | "dominio" | "secreta" | "platina";

export type AchievementMetrics = {
  completedExercises: number;
  totalExercises: number;
  completedTracks: number;
  level: number;
  xp: number;
  streakDays: number;
  essaysWritten: number;
  correctedEssays: number;
  bestEssayScore: number;
  averageEssayScore: number;
  connectiveWins: number;
  puzzleWins: number;
  argumentWins: number;
};

type AchievementDefinition = {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  target: number;
  metric: keyof AchievementMetrics;
  xp: number;
  icon: "trophy" | "pen" | "flame" | "target" | "brain" | "crown" | "shield" | "gem" | "book" | "zap";
  secret?: boolean;
};

export type AchievementProgress = AchievementDefinition & {
  current: number;
  progress: number;
  unlocked: boolean;
};

const catalog: AchievementDefinition[] = [
  {
    id: "primeira-fase",
    title: "Primeira fase",
    description: "Conclua sua primeira etapa de exercicios.",
    category: "progressao",
    rarity: "comum",
    target: 1,
    metric: "completedExercises",
    xp: 40,
    icon: "zap",
  },
  {
    id: "dez-exercicios",
    title: "Aquecimento serio",
    description: "Complete 10 exercicios em trilhas do ENEM.",
    category: "progressao",
    rarity: "comum",
    target: 10,
    metric: "completedExercises",
    xp: 90,
    icon: "target",
  },
  {
    id: "cem-questoes",
    title: "Maratonista de questoes",
    description: "Complete 100 questoes e prove consistencia.",
    category: "progressao",
    rarity: "epica",
    target: 100,
    metric: "completedExercises",
    xp: 360,
    icon: "trophy",
  },
  {
    id: "nivel-dez",
    title: "Nivel 10",
    description: "Alcance o nivel 10 da sua jornada.",
    category: "progressao",
    rarity: "rara",
    target: 10,
    metric: "level",
    xp: 180,
    icon: "shield",
  },
  {
    id: "trilha-finalizada",
    title: "Trilha finalizada",
    description: "Feche uma campanha completa ate o desafio final.",
    category: "progressao",
    rarity: "rara",
    target: 1,
    metric: "completedTracks",
    xp: 220,
    icon: "book",
  },
  {
    id: "primeira-redacao",
    title: "Primeiro rascunho serio",
    description: "Registre sua primeira redacao no laboratorio.",
    category: "redacao",
    rarity: "comum",
    target: 1,
    metric: "essaysWritten",
    xp: 70,
    icon: "pen",
  },
  {
    id: "redacao-900",
    title: "Radar dos 900",
    description: "Tire 900 ou mais em uma redacao corrigida.",
    category: "redacao",
    rarity: "epica",
    target: 900,
    metric: "bestEssayScore",
    xp: 420,
    icon: "brain",
  },
  {
    id: "redacao-1000",
    title: "Mil absoluto",
    description: "Alcance nota 1000 em uma redacao ENEM.",
    category: "redacao",
    rarity: "lendaria",
    target: 1000,
    metric: "bestEssayScore",
    xp: 1000,
    icon: "crown",
  },
  {
    id: "trinta-redacoes",
    title: "Oficina imparavel",
    description: "Produza 30 redacoes ao longo da preparacao.",
    category: "redacao",
    rarity: "lendaria",
    target: 30,
    metric: "essaysWritten",
    xp: 700,
    icon: "pen",
  },
  {
    id: "sete-dias",
    title: "Semana blindada",
    description: "Estude por 7 dias seguidos.",
    category: "streak",
    rarity: "rara",
    target: 7,
    metric: "streakDays",
    xp: 140,
    icon: "flame",
  },
  {
    id: "trinta-dias",
    title: "Rotina de elite",
    description: "Mantenha uma sequencia de 30 dias.",
    category: "streak",
    rarity: "epica",
    target: 30,
    metric: "streakDays",
    xp: 520,
    icon: "flame",
  },
  {
    id: "cem-dias",
    title: "Constancia lendaria",
    description: "Chegue a 100 dias seguidos de estudo.",
    category: "streak",
    rarity: "lendaria",
    target: 100,
    metric: "streakDays",
    xp: 1100,
    icon: "crown",
  },
  {
    id: "rei-conectivos",
    title: "Rei dos conectivos",
    description: "Venca 10 rodadas no jogo de conectivos.",
    category: "dominio",
    rarity: "rara",
    target: 10,
    metric: "connectiveWins",
    xp: 210,
    icon: "zap",
  },
  {
    id: "mestre-coesao",
    title: "Mestre da coesao",
    description: "Complete 8 puzzles de redacao com encaixe correto.",
    category: "dominio",
    rarity: "epica",
    target: 8,
    metric: "puzzleWins",
    xp: 330,
    icon: "gem",
  },
  {
    id: "mestre-argumentacao",
    title: "Mestre da argumentacao",
    description: "Acerte 8 desafios de tese e desenvolvimento.",
    category: "dominio",
    rarity: "epica",
    target: 8,
    metric: "argumentWins",
    xp: 330,
    icon: "brain",
  },
  {
    id: "media-850",
    title: "Consistencia de banca",
    description: "Mantenha media igual ou superior a 850.",
    category: "dominio",
    rarity: "epica",
    target: 850,
    metric: "averageEssayScore",
    xp: 450,
    icon: "shield",
  },
  {
    id: "secreto-cambridge",
    title: "Investigador de repertorio",
    description: "Use o laboratorio ate encontrar uma referencia estrategica rara.",
    category: "secreta",
    rarity: "rara",
    target: 4,
    metric: "puzzleWins",
    xp: 180,
    icon: "gem",
    secret: true,
  },
  {
    id: "secreto-combo",
    title: "Combo invisivel",
    description: "Some vitorias em conectivos e argumentacao para liberar um trofeu oculto.",
    category: "secreta",
    rarity: "epica",
    target: 14,
    metric: "connectiveWins",
    xp: 400,
    icon: "gem",
    secret: true,
  },
];

const iconMap: Record<AchievementDefinition["icon"], LucideIcon> = {
  trophy: Trophy,
  pen: PenLine,
  flame: Flame,
  target: Target,
  brain: Brain,
  crown: Crown,
  shield: ShieldCheck,
  gem: Gem,
  book: BookOpenCheck,
  zap: Zap,
};

const rarityLabels: Record<AchievementRarity, string> = {
  comum: "Comum",
  rara: "Rara",
  epica: "Epica",
  lendaria: "Lendaria",
  platina: "Platina",
};

const categoryLabels: Record<AchievementCategory, string> = {
  progressao: "Progressao",
  redacao: "Redacao",
  streak: "Streak",
  dominio: "Dominio",
  secreta: "Secretas",
  platina: "Platina",
};

export const achievementCategories = Object.entries(categoryLabels).map(([id, label]) => ({ id: id as AchievementCategory, label }));

export function buildAchievements(metrics: AchievementMetrics): AchievementProgress[] {
  const regular = catalog.map((achievement) => {
    const current = Math.max(0, Number(metrics[achievement.metric]) || 0);
    return toProgress(achievement, current);
  });

  const secretComboIndex = regular.findIndex((achievement) => achievement.id === "secreto-combo");
  if (secretComboIndex >= 0) {
    const current = metrics.connectiveWins + metrics.argumentWins;
    regular[secretComboIndex] = toProgress(catalog.find((item) => item.id === "secreto-combo")!, current);
  }

  const unlockedRegular = regular.filter((achievement) => achievement.unlocked).length;
  const platinumDefinition: AchievementDefinition = {
    id: "platina-donk",
    title: "Platina Donk",
    description: "Complete todas as conquistas, domine trilhas e prove excelencia em redacao.",
    category: "platina",
    rarity: "platina",
    target: regular.length,
    metric: "completedExercises",
    xp: 2500,
    icon: "crown",
  };

  return [...regular, toProgress(platinumDefinition, unlockedRegular)];
}

export function getAchievementSummary(achievements: AchievementProgress[]) {
  const unlocked = achievements.filter((achievement) => achievement.unlocked);
  const regular = achievements.filter((achievement) => achievement.rarity !== "platina");
  const unlockedRegular = regular.filter((achievement) => achievement.unlocked);
  const percent = achievements.length ? Math.round((unlocked.length / achievements.length) * 100) : 0;
  const averageRarity = getAverageRarity(unlocked);
  return {
    unlocked: unlocked.length,
    total: achievements.length,
    unlockedRegular: unlockedRegular.length,
    regularTotal: regular.length,
    percent,
    averageRarity,
    xp: unlocked.reduce((sum, achievement) => sum + achievement.xp, 0),
  };
}

export function AchievementCard({ achievement, index = 0 }: { achievement: AchievementProgress; index?: number }) {
  const hidden = achievement.secret && !achievement.unlocked;
  const Icon = hidden ? Lock : iconMap[achievement.icon];

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.025, ease: "easeOut" }}
      whileHover={{ y: -3 }}
      className={cn(
        "relative overflow-hidden rounded-lg border bg-card/82 p-4 shadow-sm backdrop-blur transition-colors",
        achievement.unlocked ? rarityCardClass(achievement.rarity) : "opacity-82",
      )}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-border to-transparent" />
      {achievement.unlocked && <div className={cn("absolute -right-10 -top-10 h-28 w-28 rounded-full blur-3xl", rarityGlowClass(achievement.rarity))} />}
      <div className="relative flex items-start gap-3">
        <div className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-lg border shadow-sm", rarityIconClass(achievement.rarity, achievement.unlocked))}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge className={rarityBadgeClass(achievement.rarity)}>{rarityLabels[achievement.rarity]}</Badge>
            {achievement.unlocked && (
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Desbloqueada
              </Badge>
            )}
          </div>
          <h3 className="text-base font-black tracking-normal">{hidden ? "Conquista secreta" : achievement.title}</h3>
          <p className="mt-2 min-h-10 text-sm leading-6 text-muted-foreground">
            {hidden ? "Continue explorando o laboratorio e as trilhas para revelar este trofeu." : achievement.description}
          </p>
        </div>
      </div>
      <div className="relative mt-4">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-bold text-muted-foreground">{hidden ? "Progresso oculto" : `${Math.min(achievement.current, achievement.target)}/${achievement.target}`}</span>
          <span className="font-black text-secondary">+{achievement.xp} XP</span>
        </div>
        <Progress value={hidden ? 0 : achievement.progress} className="h-2.5" />
      </div>
    </motion.article>
  );
}

export function TrophyShowcase({
  achievements,
  level,
  streak,
}: {
  achievements: AchievementProgress[];
  level: number;
  streak: number;
}) {
  const summary = getAchievementSummary(achievements);
  const rareUnlocked = achievements.filter((achievement) => achievement.unlocked && ["epica", "lendaria", "platina"].includes(achievement.rarity)).length;

  return (
    <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-lg border bg-primary p-5 text-primary-foreground shadow-premium"
      >
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.16),transparent_46%),radial-gradient(circle_at_85%_18%,rgba(201,162,39,0.34),transparent_15rem)]" />
        <div className="relative grid gap-5 md:grid-cols-[150px_1fr] md:items-center">
          <div className="relative mx-auto grid h-36 w-36 place-items-center">
            <svg className="h-36 w-36 -rotate-90" viewBox="0 0 148 148" aria-hidden="true">
              <circle cx="74" cy="74" r="60" fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="12" />
              <motion.circle
                cx="74"
                cy="74"
                r="60"
                fill="none"
                stroke="#C9A227"
                strokeLinecap="round"
                strokeWidth="12"
                strokeDasharray={2 * Math.PI * 60}
                initial={{ strokeDashoffset: 2 * Math.PI * 60 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 60 - (summary.percent / 100) * (2 * Math.PI * 60) }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="text-xs text-white/68">Colecao</p>
                <p className="text-4xl font-black">{summary.percent}%</p>
              </div>
            </div>
          </div>
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-white/12 px-3 py-1 text-xs font-black text-white/78">
              <Sparkles className="h-3.5 w-3.5 text-secondary" aria-hidden="true" />
              Perfil gamer premium
            </div>
            <h2 className="text-3xl font-black tracking-normal md:text-4xl">Sala de trofeus</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/74">
              Cada trofeu registra uma habilidade real: constancia, dominio de competencia, precisao em conectivos e maturidade argumentativa.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-4">
              <ShowcaseMetric label="Nivel" value={String(level)} />
              <ShowcaseMetric label="Streak" value={`${streak}d`} />
              <ShowcaseMetric label="Trofeus" value={`${summary.unlocked}/${summary.total}`} />
              <ShowcaseMetric label="Raros+" value={String(rareUnlocked)} />
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
        <ProgressTracker title="XP de conquistas" value={`${summary.xp} XP`} progress={Math.min(100, summary.xp / 24)} icon={Zap} tone="gold" />
        <ProgressTracker title="Raridade media" value={summary.averageRarity} progress={summary.unlocked ? Math.min(100, summary.unlocked * 8) : 0} icon={Gem} tone="primary" />
        <ProgressTracker title="Para platinar" value={`${summary.unlockedRegular}/${summary.regularTotal}`} progress={(summary.unlockedRegular / Math.max(1, summary.regularTotal)) * 100} icon={Crown} tone="accent" />
      </div>
    </section>
  );
}

export function PlatinumAchievement({ achievement }: { achievement: AchievementProgress }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-lg border p-5 shadow-premium",
        achievement.unlocked ? "bg-gradient-to-br from-white via-secondary/18 to-accent/18 dark:from-card dark:via-secondary/16 dark:to-primary/22" : "bg-card/86",
      )}
    >
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,.12),transparent_38%,rgba(201,162,39,.14))]" />
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <motion.div
            animate={achievement.unlocked ? { rotate: [0, -4, 4, 0], scale: [1, 1.04, 1] } : undefined}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className={cn(
              "grid h-16 w-16 shrink-0 place-items-center rounded-2xl border shadow-glow",
              achievement.unlocked ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            <Crown className="h-8 w-8" aria-hidden="true" />
          </motion.div>
          <div>
            <p className="text-xs font-black uppercase text-muted-foreground">Conquista final</p>
            <h2 className="mt-1 text-2xl font-black tracking-normal">{achievement.title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{achievement.description}</p>
          </div>
        </div>
        <div className="min-w-[220px] rounded-lg border bg-background/64 p-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-bold text-muted-foreground">Checklist final</span>
            <span className="font-black text-secondary">
              {achievement.current}/{achievement.target}
            </span>
          </div>
          <Progress value={achievement.progress} />
        </div>
      </div>
    </motion.section>
  );
}

export function XPRewardModal({
  open,
  title,
  description,
  xp,
  rarity = "rara",
  actionLabel = "Continuar",
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  xp: number;
  rarity?: AchievementRarity;
  actionLabel?: string;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/48 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className="relative w-full max-w-md overflow-hidden rounded-lg border bg-card p-6 text-center shadow-premium"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Fechar recompensa"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 12 }, (_, index) => (
            <motion.span
              key={index}
              initial={{ opacity: 0, y: 8, scale: 0.7 }}
              animate={{ opacity: [0, 1, 0], y: [-4, -52 - (index % 4) * 12], x: (index - 6) * 14, scale: [0.7, 1, 0.8] }}
              transition={{ duration: 1.45, delay: index * 0.035, ease: "easeOut" }}
              className={cn("absolute bottom-20 left-1/2 h-2 w-2 rounded-full", index % 2 ? "bg-secondary" : "bg-accent")}
            />
          ))}
        </div>
        <motion.div
          initial={{ rotate: -12, scale: 0.8 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 15 }}
          className={cn("mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl border p-4 shadow-glow", rarityIconClass(rarity, true))}
        >
          <Trophy className="h-9 w-9" aria-hidden="true" />
        </motion.div>
        <Badge className={cn("mb-3", rarityBadgeClass(rarity))}>{rarityLabels[rarity]}</Badge>
        <h2 className="text-3xl font-black tracking-normal">{title}</h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
        <div className="mt-5 rounded-lg border bg-secondary/12 p-4">
          <p className="text-xs font-black uppercase text-muted-foreground">Recompensa</p>
          <p className="mt-1 text-3xl font-black text-secondary">+{xp} XP</p>
        </div>
        <Button onClick={onClose} className="mt-5 w-full">
          {actionLabel}
        </Button>
      </motion.div>
    </div>
  );
}

export function ProgressTracker({
  title,
  value,
  progress,
  icon: Icon,
  tone = "primary",
}: {
  title: string;
  value: string;
  progress: number;
  icon: LucideIcon;
  tone?: "primary" | "gold" | "accent";
}) {
  const toneClass = {
    primary: "bg-primary/12 text-primary",
    gold: "bg-secondary/18 text-secondary",
    accent: "bg-accent/12 text-accent",
  }[tone];

  return (
    <motion.div whileHover={{ y: -2 }} className="rounded-lg border bg-card/82 p-4 shadow-sm backdrop-blur">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-black tracking-normal">{value}</p>
        </div>
        <div className={cn("grid h-10 w-10 place-items-center rounded-lg", toneClass)}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      <Progress value={Math.max(0, Math.min(100, progress))} className="h-2.5" />
    </motion.div>
  );
}

function toProgress(achievement: AchievementDefinition, current: number): AchievementProgress {
  return {
    ...achievement,
    current,
    progress: Math.max(0, Math.min(100, (current / Math.max(1, achievement.target)) * 100)),
    unlocked: current >= achievement.target,
  };
}

function getAverageRarity(achievements: AchievementProgress[]) {
  if (!achievements.length) return "Inicial";
  const weights: Record<AchievementRarity, number> = { comum: 1, rara: 2, epica: 3, lendaria: 4, platina: 5 };
  const average = achievements.reduce((sum, achievement) => sum + weights[achievement.rarity], 0) / achievements.length;
  if (average >= 4.4) return "Platina";
  if (average >= 3.4) return "Lendaria";
  if (average >= 2.5) return "Epica";
  if (average >= 1.6) return "Rara";
  return "Comum";
}

function ShowcaseMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/12 bg-white/10 p-3">
      <p className="text-[11px] font-black uppercase text-white/62">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}

function rarityCardClass(rarity: AchievementRarity) {
  if (rarity === "platina") return "border-secondary/42 bg-gradient-to-br from-card via-secondary/10 to-accent/12";
  if (rarity === "lendaria") return "border-secondary/38 bg-secondary/8";
  if (rarity === "epica") return "border-primary/28 bg-primary/7";
  if (rarity === "rara") return "border-accent/28 bg-accent/7";
  return "border-border";
}

function rarityGlowClass(rarity: AchievementRarity) {
  if (rarity === "platina") return "bg-secondary/35";
  if (rarity === "lendaria") return "bg-secondary/28";
  if (rarity === "epica") return "bg-primary/22";
  if (rarity === "rara") return "bg-accent/20";
  return "bg-muted";
}

function rarityIconClass(rarity: AchievementRarity, unlocked: boolean) {
  if (!unlocked) return "bg-muted text-muted-foreground";
  if (rarity === "platina") return "bg-secondary text-secondary-foreground border-secondary/50";
  if (rarity === "lendaria") return "bg-gradient-to-br from-secondary to-primary text-white border-secondary/50";
  if (rarity === "epica") return "bg-primary text-primary-foreground border-primary/40";
  if (rarity === "rara") return "bg-accent text-accent-foreground border-accent/40";
  return "bg-background text-foreground";
}

function rarityBadgeClass(rarity: AchievementRarity) {
  if (rarity === "platina") return "bg-secondary text-secondary-foreground";
  if (rarity === "lendaria") return "bg-secondary/20 text-secondary";
  if (rarity === "epica") return "bg-primary/12 text-primary";
  if (rarity === "rara") return "bg-accent/12 text-accent";
  return "bg-muted text-muted-foreground";
}
