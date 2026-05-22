import type { LucideIcon } from "lucide-react";

export type GameCategoryId =
  | "estrutura"
  | "coesao"
  | "argumentacao"
  | "repertorio"
  | "gramatica"
  | "competencias-enem"
  | "desafios-diarios";

export type GameDifficulty = "Essencial" | "Intermediario" | "Avancado";

type BadgeRarity = "comum" | "raro" | "epico" | "lendario";

type GameEngine = "quiz" | "choice" | "sequence";

type GameQuestion = {
  id: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

export type GameDefinition = {
  id: string;
  name: string;
  category: GameCategoryId;
  description: string;
  difficulty: GameDifficulty;
  xpReward: number;
  estimatedTime: string;
  thumbnail: string;
  progress: number;
  unlocked: boolean;
  engine: GameEngine;
  skill: string;
  questions: GameQuestion[];
};

export type GameCategory = {
  id: GameCategoryId;
  name: string;
  slug: GameCategoryId;
  description: string;
  icon: LucideIcon;
  progress: number;
  secondaryColor: string;
  gameCount: number;
  masteryLevel: string;
};

export type GameAttempt = {
  id: string;
  gameId: string;
  category: GameCategoryId;
  score: number;
  total: number;
  accuracy: number;
  xpEarned: number;
  playedAt: string;
  durationSeconds: number;
};

export type GameProgress = {
  gameId: string;
  plays: number;
  bestScore: number;
  bestAccuracy: number;
  progress: number;
  completedToday: boolean;
  lastPlayedAt?: string;
};

export type BadgeDefinition = {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  rarity: BadgeRarity;
};

export type StreakState = {
  current: number;
  best: number;
  lastActiveDate?: string;
};

export type GameCompletion = {
  attempt: GameAttempt;
  xpEarned: number;
  unlockedBadges: string[];
  xpBefore: number;
  xpAfter: number;
  rankUp: boolean;
  rankName: string;
};
