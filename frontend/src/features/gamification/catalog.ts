import { BadgeCheck, CalendarCheck, FileStack, Library, Link2, MessageSquareQuote, SpellCheck } from "lucide-react";

import type { GameCategory, GameCategoryId, GameDefinition, GameDifficulty, GameProgress } from "@/features/gamification/types";
import { challengeGames } from "@/games/challenges";
import { competencyGames } from "@/games/competencies";
import { connectiveGames } from "@/games/connectives";
import { grammarGames } from "@/games/grammar";
import { repertoireGames } from "@/games/repertoire";
import { structureGames } from "@/games/structure";
import { thesisGames } from "@/games/thesis";
import type { PublishedGame } from "@/types/api";

const gamesCatalog: GameDefinition[] = [
  ...structureGames,
  ...connectiveGames,
  ...thesisGames,
  ...repertoireGames,
  ...grammarGames,
  ...competencyGames,
  ...challengeGames,
];

const VALID_CATEGORIES: GameCategoryId[] = [
  "estrutura",
  "coesao",
  "argumentacao",
  "repertorio",
  "gramatica",
  "competencias-enem",
  "desafios-diarios",
];

const DIFFICULTY_LABEL: Record<string, GameDifficulty> = {
  easy: "Essencial",
  medium: "Intermediario",
  hard: "Avancado",
};

/** Converte um jogo aprovado vindo do backend em GameDefinition jogavel pelo aluno. */
export function mapPublishedGame(game: PublishedGame): GameDefinition {
  const category = (VALID_CATEGORIES.includes(game.category as GameCategoryId)
    ? game.category
    : "competencias-enem") as GameCategoryId;
  return {
    id: `ai-${game.id}`,
    name: game.name,
    category,
    description: game.skill ? `Atividade gerada para treinar ${game.skill}.` : "Atividade gerada por IA.",
    difficulty: DIFFICULTY_LABEL[game.difficulty] ?? "Intermediario",
    xpReward: game.xp_reward,
    estimatedTime: `${Math.max(2, Math.round(game.questions.length * 0.5))} min`,
    thumbnail: `${category}-ia`,
    progress: 0,
    unlocked: true,
    engine: "quiz",
    skill: game.skill || "Treino",
    questions: game.questions.map((q, index) => ({
      id: `ai-${game.id}-q${index}`,
      prompt: q.prompt,
      options: q.options,
      answerIndex: q.answer_index,
      explanation: q.explanation,
    })),
  };
}

const baseCategories: GameCategory[] = [
  {
    id: "estrutura",
    slug: "estrutura",
    name: "Estrutura",
    description: "Organizacao de paragrafos, introducao, desenvolvimento e intervencao.",
    icon: FileStack,
    progress: 0,
    secondaryColor: "hsl(215 100% 61%)",
    gameCount: 0,
    masteryLevel: "Inicial",
  },
  {
    id: "coesao",
    slug: "coesao",
    name: "Coesao",
    description: "Conectivos, retomadas e progressao textual sem repeticao.",
    icon: Link2,
    progress: 0,
    secondaryColor: "hsl(134 61% 41%)",
    gameCount: 0,
    masteryLevel: "Inicial",
  },
  {
    id: "argumentacao",
    slug: "argumentacao",
    name: "Argumentacao",
    description: "Tese, causa, consequencia e mapa argumentativo.",
    icon: MessageSquareQuote,
    progress: 0,
    secondaryColor: "hsl(354 70% 54%)",
    gameCount: 0,
    masteryLevel: "Inicial",
  },
  {
    id: "repertorio",
    slug: "repertorio",
    name: "Repertorio",
    description: "Autores, obras, conceitos e uso produtivo no texto.",
    icon: Library,
    progress: 0,
    secondaryColor: "hsl(0 0% 20%)",
    gameCount: 0,
    masteryLevel: "Inicial",
  },
  {
    id: "gramatica",
    slug: "gramatica",
    name: "Gramatica",
    description: "Norma-padrao aplicada, pontuacao e revisao fina.",
    icon: SpellCheck,
    progress: 0,
    secondaryColor: "hsl(215 100% 61%)",
    gameCount: 0,
    masteryLevel: "Inicial",
  },
  {
    id: "competencias-enem",
    slug: "competencias-enem",
    name: "Competencias ENEM",
    description: "Diagnostico e leitura da matriz oficial de correcao.",
    icon: BadgeCheck,
    progress: 0,
    secondaryColor: "hsl(134 61% 41%)",
    gameCount: 0,
    masteryLevel: "Inicial",
  },
  {
    id: "desafios-diarios",
    slug: "desafios-diarios",
    name: "Desafios Diarios",
    description: "Sessoes curtas para manter constancia sem excesso visual.",
    icon: CalendarCheck,
    progress: 0,
    secondaryColor: "hsl(354 70% 54%)",
    gameCount: 0,
    masteryLevel: "Inicial",
  },
];

export function getCategoryBySlug(slug: string) {
  return baseCategories.find((category) => category.slug === slug);
}

export function getGameById(gameId: string, extra: GameDefinition[] = []) {
  return [...gamesCatalog, ...extra].find((game) => game.id === gameId);
}

export function getGamesByCategory(category: GameCategoryId, extra: GameDefinition[] = []) {
  return [...gamesCatalog, ...extra].filter((game) => game.category === category);
}

export function getRecommendedGames(progress: Record<string, GameProgress>, extra: GameDefinition[] = []) {
  return [...gamesCatalog, ...extra]
    .sort((a, b) => {
      const aProgress = progress[a.id]?.progress ?? 0;
      const bProgress = progress[b.id]?.progress ?? 0;
      return aProgress - bProgress || b.xpReward - a.xpReward;
    })
    .slice(0, 4);
}

export function getEnrichedGames(progress: Record<string, GameProgress>, extra: GameDefinition[] = []) {
  return [...gamesCatalog, ...extra].map((game) => ({
    ...game,
    progress: progress[game.id]?.progress ?? game.progress,
    unlocked: game.unlocked,
  }));
}

export function getEnrichedCategories(progress: Record<string, GameProgress>, extra: GameDefinition[] = []) {
  return baseCategories.map((category) => {
    const games = getGamesByCategory(category.id, extra);
    const categoryProgress = games.length
      ? Math.round(games.reduce((sum, game) => sum + (progress[game.id]?.progress ?? 0), 0) / games.length)
      : 0;
    return {
      ...category,
      progress: categoryProgress,
      gameCount: games.length,
      masteryLevel: masteryLabel(categoryProgress),
    };
  });
}

function masteryLabel(progress: number) {
  if (progress >= 90) return "Dominio";
  if (progress >= 65) return "Avancando";
  if (progress >= 35) return "Em progresso";
  return "Inicial";
}
