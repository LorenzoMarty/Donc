import { BadgeCheck, CalendarCheck, FileStack, Library, Link2, MessageSquareQuote, SpellCheck } from "lucide-react";

import type { GameCategory, GameCategoryId, GameDefinition, GameProgress } from "@/features/gamification/types";
import { connectiveGames } from "@/games/connectives";
import { grammarGames } from "@/games/grammar";
import { repertoireGames } from "@/games/repertoire";
import { structureGames } from "@/games/structure";
import { thesisGames } from "@/games/thesis";

const gamesCatalog: GameDefinition[] = [...structureGames, ...connectiveGames, ...thesisGames, ...repertoireGames, ...grammarGames];

const baseCategories: GameCategory[] = [
  {
    id: "estrutura",
    slug: "estrutura",
    name: "Estrutura",
    description: "Organizacao de paragrafos, introducao, desenvolvimento e intervencao.",
    icon: FileStack,
    progress: 0,
    secondaryColor: "hsl(46 100% 50%)",
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
    secondaryColor: "hsl(46 100% 50%)",
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
    secondaryColor: "hsl(46 100% 50%)",
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
    secondaryColor: "hsl(46 100% 50%)",
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
    secondaryColor: "hsl(46 100% 50%)",
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
    secondaryColor: "hsl(46 100% 50%)",
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
    secondaryColor: "hsl(46 100% 50%)",
    gameCount: 0,
    masteryLevel: "Inicial",
  },
];

export function getCategoryBySlug(slug: string) {
  return baseCategories.find((category) => category.slug === slug);
}

export function getGameById(gameId: string) {
  return gamesCatalog.find((game) => game.id === gameId);
}

export function getGamesByCategory(category: GameCategoryId) {
  return gamesCatalog.filter((game) => game.category === category);
}

export function getRecommendedGames(progress: Record<string, GameProgress>) {
  return [...gamesCatalog]
    .sort((a, b) => {
      const aProgress = progress[a.id]?.progress ?? 0;
      const bProgress = progress[b.id]?.progress ?? 0;
      return aProgress - bProgress || b.xpReward - a.xpReward;
    })
    .slice(0, 4);
}

export function getEnrichedGames(progress: Record<string, GameProgress>) {
  return gamesCatalog.map((game) => ({
    ...game,
    progress: progress[game.id]?.progress ?? game.progress,
    unlocked: game.unlocked,
  }));
}

export function getEnrichedCategories(progress: Record<string, GameProgress>) {
  return baseCategories.map((category) => {
    const games = getGamesByCategory(category.id);
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
