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

export type GameEngine = "quiz" | "choice" | "sequence" | "timed-rush" | "classify" | "order" | "fill-blank";

export type GameQuestion = {
  id: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

/** Payload do engine `classify`: arrastar cada item para o balde correto. */
export type ClassifyBucket = {
  id: string;
  label: string;
  hint?: string;
};

export type ClassifyItem = {
  id: string;
  text: string;
  bucketId: string;
  explanation?: string;
};

export type ClassifyPayload = {
  instruction: string;
  buckets: ClassifyBucket[];
  items: ClassifyItem[];
};

/** Payload do engine `order`: ordenar frases na sequencia correta. Cada rodada e independente. */
export type OrderRound = {
  id: string;
  instruction: string;
  /** Itens ja na ordem correta; a UI embaralha para o aluno. */
  items: string[];
  explanation: string;
};

export type OrderPayload = {
  rounds: OrderRound[];
};

/** Payload do engine `fill-blank`: digitar a resposta que completa a lacuna `___`. */
export type FillBlankRound = {
  id: string;
  /** Texto com `___` marcando a lacuna. */
  prompt: string;
  /** Respostas aceitas (normalizadas: minusculas, sem acento, espacos colapsados). */
  accepted: string[];
  explanation: string;
};

export type FillBlankPayload = {
  rounds: FillBlankRound[];
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
  /** Usado por `quiz`, `choice` e `timed-rush`. */
  questions?: GameQuestion[];
  /** Usado por `classify`. */
  classify?: ClassifyPayload;
  /** Usado por `order`. */
  order?: OrderPayload;
  /** Usado por `fill-blank`. */
  fillBlank?: FillBlankPayload;
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

export type StreakState = {
  current: number;
  best: number;
  lastActiveDate?: string;
};

export type GameCompletion = {
  attempt: GameAttempt;
  xpEarned: number;
  xpBefore: number;
  xpAfter: number;
  rankUp: boolean;
  rankName: string;
};
