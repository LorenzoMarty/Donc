import { BadgeCheck, CalendarCheck, FileStack, Library, Link2, MessageSquareQuote, SpellCheck } from "lucide-react";

import type { GameCategory, GameCategoryId, GameDefinition, GameDifficulty, GameProgress } from "@/features/gamification/types";
import { deriveHubsFromTags, possibleEventsForHubs } from "@/features/gamification/adaptive";
import { tagPositionalDifficulty } from "@/features/gamification/item-difficulty";
import { gameTags } from "@/features/gamification/symptoms";
import type { PublishedGame } from "@/types/api";

/**
 * Garante o contrato cognitivo de toda missão: preenche `skills`/`hubs`/`possibleEvents` a partir
 * das `tags` quando o autor não os declarou. Missões profundas podem sobrescrever com valores
 * curados; o enriquecimento só completa o que falta.
 */
export function enrichGame(game: GameDefinition): GameDefinition {
  const skills = game.skills ?? gameTags(game);
  const hubs = game.hubs ?? deriveHubsFromTags(skills);
  const possibleEvents = game.possibleEvents ?? possibleEventsForHubs(hubs);
  const questions = game.questions && tagPositionalDifficulty(game.questions);
  const classify = game.classify && { ...game.classify, items: tagPositionalDifficulty(game.classify.items) };
  const order = game.order && { ...game.order, rounds: tagPositionalDifficulty(game.order.rounds) };
  const fillBlank = game.fillBlank && { ...game.fillBlank, rounds: tagPositionalDifficulty(game.fillBlank.rounds) };
  return {
    ...game,
    skills,
    hubs,
    possibleEvents,
    ...(questions && { questions }),
    ...(classify && { classify }),
    ...(order && { order }),
    ...(fillBlank && { fillBlank }),
  };
}

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

// Engines cujo conteudo mora em `questions` (mesmo payload pergunta+alternativas).
const QUESTION_BASED_ENGINES = new Set(["quiz", "timed-rush", "sequence", "choice"]);

// engine -> chave de GameDefinition onde o `payload` do backend deve entrar.
const PAYLOAD_FIELD_BY_ENGINE: Record<string, keyof GameDefinition> = {
  classify: "classify",
  order: "order",
  "fill-blank": "fillBlank",
  duel: "duel",
  "argument-escalation": "escalation",
  artificiality: "artificiality",
  corrector: "corrector",
  "essay-collapse": "essayCollapse",
  "text-surgery": "textSurgery",
  survival: "survival",
};

/** Converte um jogo aprovado vindo do backend em GameDefinition jogavel pelo aluno — banco e a
 * unica fonte (spec migrar-jogos-estaticos-para-banco REQ-4), suporta qualquer um dos 13 engines. */
export function mapPublishedGame(game: PublishedGame): GameDefinition {
  const category = (VALID_CATEGORIES.includes(game.category as GameCategoryId)
    ? game.category
    : "competencias-enem") as GameCategoryId;
  const engine = game.engine as GameDefinition["engine"];
  const base: GameDefinition = {
    id: `ai-${game.id}`,
    name: game.name,
    category,
    description: game.description ?? (game.skill ? `Atividade gerada para treinar ${game.skill}.` : "Atividade gerada por IA."),
    difficulty: DIFFICULTY_LABEL[game.difficulty] ?? "Intermediario",
    estimatedTime: game.estimated_time ?? `${Math.max(2, Math.round(game.questions.length * 0.5))} min`,
    thumbnail: game.thumbnail ?? `${category}-ia`,
    progress: 0,
    unlocked: true,
    engine,
    skill: game.skill || "Treino",
  };
  if (QUESTION_BASED_ENGINES.has(engine)) {
    base.questions = game.questions.map((q, index) => ({
      id: `ai-${game.id}-q${index}`,
      prompt: q.prompt,
      options: q.options,
      answerIndex: q.answer_index,
      explanation: q.explanation,
    }));
  } else {
    const field = PAYLOAD_FIELD_BY_ENGINE[engine];
    if (field && game.payload) {
      (base as Record<string, unknown>)[field] = game.payload;
    }
  }
  return enrichGame(base);
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
    description: "Diagnóstico e leitura da matriz oficial de correção.",
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
    description: "Sessões curtas para manter constância sem excesso visual.",
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

/** Jogos vem 100% do banco (spec migrar-jogos-estaticos-para-banco REQ-4) — `extra` e a lista
 * hidratada de `/games/published` (`useGameStore.remoteGames`), ja passada por `mapPublishedGame`. */
export function getGameById(gameId: string, extra: GameDefinition[] = []) {
  return extra.find((game) => game.id === gameId);
}

export function getAllGames(extra: GameDefinition[] = []) {
  return extra;
}

export function getGamesByCategory(category: GameCategoryId, extra: GameDefinition[] = []) {
  return extra.filter((game) => game.category === category);
}

export function getRecommendedGames(progress: Record<string, GameProgress>, extra: GameDefinition[] = []) {
  return [...extra]
    .sort((a, b) => {
      const aProgress = progress[a.id]?.progress ?? 0;
      const bProgress = progress[b.id]?.progress ?? 0;
      return aProgress - bProgress;
    })
    .slice(0, 4);
}

export function getEnrichedGames(progress: Record<string, GameProgress>, extra: GameDefinition[] = []) {
  return extra.map((game) => ({
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
