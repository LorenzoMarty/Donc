import type { GameDefinition } from "@/features/gamification/types";

type RankId = "aprendiz" | "argumentador" | "estrategista" | "orador" | "mestre";

type RankDefinition = {
  id: RankId;
  name: string;
  minXp: number;
  description: string;
  exerciseDifficulty: "easy" | "medium" | "hard";
};

const rankCatalog: RankDefinition[] = [
  { id: "aprendiz", name: "Aprendiz", minXp: 0, description: "Construindo constância e base estrutural.", exerciseDifficulty: "easy" },
  {
    id: "argumentador",
    name: "Argumentador",
    minXp: 350,
    description: "Transformando ideias em argumentos mais claros.",
    exerciseDifficulty: "medium",
  },
  {
    id: "estrategista",
    name: "Estrategista",
    minXp: 900,
    description: "Escolhendo repertório, tese e coesão com intenção.",
    exerciseDifficulty: "hard",
  },
  { id: "orador", name: "Orador", minXp: 1650, description: "Dominando ritmo, precisão e repertório produtivo.", exerciseDifficulty: "hard" },
  {
    id: "mestre",
    name: "Mestre da Redação",
    minXp: 2700,
    description: "Alto domínio da escrita ENEM em prática recorrente.",
    exerciseDifficulty: "hard",
  },
];

export function calculateXpReward(game: GameDefinition, isRepeatToday: boolean, accuracy: number) {
  const accuracyMultiplier = accuracy >= 90 ? 1.15 : accuracy >= 70 ? 1 : 0.72;
  const base = Math.round(game.xpReward * accuracyMultiplier);
  if (!isRepeatToday) return base;
  return Math.max(5, Math.round(base * 0.25));
}

function xpToLevel(xp: number) {
  return Math.max(1, Math.floor(xp / 350) + 1);
}

export function getRankForXp(xp: number) {
  return [...rankCatalog].reverse().find((rank) => xp >= rank.minXp) ?? rankCatalog[0];
}

function getNextRank(xp: number) {
  return rankCatalog.find((rank) => rank.minXp > xp) ?? null;
}

function getRankProgress(xp: number) {
  const current = getRankForXp(xp);
  const next = getNextRank(xp);
  if (!next) return 100;
  const range = next.minXp - current.minXp;
  return Math.max(0, Math.min(100, Math.round(((xp - current.minXp) / range) * 100)));
}

function getXpToNextRank(xp: number) {
  const next = getNextRank(xp);
  return next ? Math.max(0, next.minXp - xp) : 0;
}

export function getRankSnapshot(xp: number) {
  const current = getRankForXp(xp);
  const next = getNextRank(xp);
  return {
    current,
    next,
    progress: getRankProgress(xp),
    xpToNext: getXpToNextRank(xp),
    level: xpToLevel(xp),
  };
}
