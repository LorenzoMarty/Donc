import { Bot, Repeat, Library, Layers, PenLine, Target, Flag } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type {
  CognitiveEvent,
  CognitiveFocus,
  GameDefinition,
  GameEngine,
  SkillTag,
  SymptomHubId,
} from "@/features/gamification/types";

/** Perfil legado: por tag, quantas tentativas e quantos erros o aluno acumulou (compat). */
export type SkillStat = { attempts: number; errors: number };
export type SkillProfile = Partial<Record<SkillTag, SkillStat>>;

/**
 * Registro completo de um hub de sintoma — a unidade de navegação cognitiva. Fonte única de
 * verdade: metadados de UI (título/ícone/cor) + contrato cognitivo (eventos, foco, engines).
 */
export type SymptomHub = {
  id: SymptomHubId;
  /** Título orientado ao aluno ("Seu texto parece robótico"). */
  title: string;
  /** Rótulo curto para chips/recomendação. */
  label: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  /** Tags/skills internas pertencentes a este hub. */
  tags: SkillTag[];
  /** Eventos que sinalizam o sintoma presente (fraqueza). */
  negativeEvents: CognitiveEvent[];
  /** Eventos que sinalizam qualidade demonstrada (maestria). */
  positiveEvents: CognitiveEvent[];
  /** Tipos de trabalho cognitivo que o hub treina. */
  cognitiveFocus: CognitiveFocus[];
  /** Engines de missão profundos preferidos para treinar este hub. */
  missionEngines: GameEngine[];
  /** Frase de fraqueza dominante para o treinador adaptativo. */
  weaknessNarrative: string;
};

/** Registro central dos 7 hubs. Toda a arquitetura cognitiva referencia daqui. */
export const HUBS: Record<SymptomHubId, SymptomHub> = {
  "texto-robotico": {
    id: "texto-robotico",
    title: "Seu texto parece robótico",
    label: "Texto artificial",
    description:
      "Suas frases soam montadas — conectivos colados, construções padronizadas. Treine para escrever com voz própria.",
    icon: Bot,
    accent: "hsl(215 100% 61%)",
    tags: ["texto-robotico", "conectivo-artificial", "abstracao-excessiva"],
    negativeEvents: ["ARTIFICIAL_TONE", "GENERIC_SENTENCE"],
    positiveEvents: ["NATURAL_FLOW"],
    cognitiveFocus: ["diagnosis", "refinement"],
    missionEngines: ["duel", "artificiality", "text-surgery"],
    weaknessNarrative:
      "Suas frases ainda soam montadas. Treine ritmo e naturalidade até sumir a cara de fórmula.",
  },
  "repete-ideias": {
    id: "repete-ideias",
    title: "Você repete ideias",
    label: "Repetição",
    description:
      "Mesma palavra, mesmo argumento em parágrafos diferentes. Treine progressão e variação para avançar o raciocínio.",
    icon: Repeat,
    accent: "hsl(134 61% 41%)",
    tags: ["repeticao-lexical", "progressao-fraca"],
    negativeEvents: ["LEXICAL_REPETITION"],
    positiveEvents: ["LEXICAL_VARIETY"],
    cognitiveFocus: ["refinement", "reconstruction"],
    missionEngines: ["text-surgery", "essay-collapse"],
    weaknessNarrative:
      "Você repete palavras e ideias sem avançar. Treine variação lexical para cada parágrafo acrescentar algo novo.",
  },
  "repertorio-nao-encaixa": {
    id: "repertorio-nao-encaixa",
    title: "Seu repertório não encaixa",
    label: "Repertório forçado",
    description:
      "Você usa citações que não conectam com o argumento. Treine a integração do repertório ao raciocínio central.",
    icon: Library,
    accent: "hsl(0 0% 20%)",
    tags: ["repertorio-decorativo", "c2"],
    negativeEvents: ["FORCED_REPERTOIRE"],
    positiveEvents: ["GOOD_REPERTOIRE_LINK"],
    cognitiveFocus: ["prioritization", "reconstruction"],
    missionEngines: ["text-surgery", "duel"],
    weaknessNarrative:
      "Seu repertório entra sem conectar com o argumento. Treine a seleção e a articulação da referência com a tese.",
  },
  "nao-aprofunda": {
    id: "nao-aprofunda",
    title: "Seu texto não aprofunda",
    label: "Argumentação rasa",
    description:
      "Você apresenta a ideia mas não desdobra o raciocínio. Treine a escalada do argumento: causa, consequência, solução.",
    icon: Layers,
    accent: "hsl(262 60% 55%)",
    tags: ["argumentacao-rasa", "abstracao-excessiva"],
    negativeEvents: ["SHALLOW_ARGUMENT"],
    positiveEvents: ["DEEP_ARGUMENT"],
    cognitiveFocus: ["progression", "diagnosis"],
    missionEngines: ["argument-escalation", "duel"],
    weaknessNarrative:
      "Seus argumentos ficam na superfície. Treine o encadeamento causa → consequência → evidência para aprofundar.",
  },
  "introducao-sem-tese": {
    id: "introducao-sem-tese",
    title: "Sua introdução não cria tese",
    label: "Tese vaga",
    description:
      "Você contextualiza o tema mas não delimita ponto de vista. Treine a construção de teses específicas e defensáveis.",
    icon: PenLine,
    accent: "hsl(354 70% 54%)",
    tags: ["introducao-sem-tese", "tese-vaga"],
    negativeEvents: ["VAGUE_THESIS"],
    positiveEvents: ["SHARP_THESIS"],
    cognitiveFocus: ["diagnosis", "prioritization"],
    missionEngines: ["argument-escalation", "duel"],
    weaknessNarrative:
      "Sua introdução não define posição clara. Treine a formulação de teses específicas — o avaliador precisa saber o que você defende.",
  },
  "perde-na-c3": {
    id: "perde-na-c3",
    title: "Você perde na Competência 3",
    label: "Progressão (C3)",
    description:
      "Seus parágrafos não encadeiam — cada um parece isolado. Treine seleção, ordem e conexão de ideias.",
    icon: Target,
    accent: "hsl(28 90% 52%)",
    tags: ["c3", "progressao-fraca", "argumentacao-rasa"],
    negativeEvents: ["WEAK_PROGRESSION"],
    positiveEvents: ["GOOD_PROGRESSION"],
    cognitiveFocus: ["progression", "reconstruction"],
    missionEngines: ["essay-collapse", "argument-escalation"],
    weaknessNarrative:
      "Seus parágrafos não encadeiam. Treine o projeto de texto: cada parágrafo deve continuar o raciocínio do anterior.",
  },
  "conclusao-formula": {
    id: "conclusao-formula",
    title: "Sua conclusão é fórmula pronta",
    label: "Conclusão clichê",
    description:
      "Você fecha com proposta incompleta ou clichê de conscientização. Treine os 5 elementos da intervenção (C5).",
    icon: Flag,
    accent: "hsl(190 80% 40%)",
    tags: ["conclusao-formula", "intervencao-incompleta", "c5"],
    negativeEvents: ["FORMULAIC_CONCLUSION"],
    positiveEvents: ["COMPLETE_INTERVENTION"],
    cognitiveFocus: ["reconstruction", "prioritization"],
    missionEngines: ["corrector", "essay-collapse"],
    weaknessNarrative:
      "Sua conclusão fecha sem proposta completa. Treine os 5 elementos da C5: agente, ação, meio, finalidade e detalhamento.",
  },
};

/** Lista derivada (ordem estável) para consumidores de UI. */
export const symptomHubs: SymptomHub[] = Object.values(HUBS);

export const HUB_IDS = Object.keys(HUBS) as SymptomHubId[];

export function getSymptomHub(id: string): SymptomHub | undefined {
  return HUBS[id as SymptomHubId];
}

/** Cache por identidade do objeto — `gameTags` é pura sobre `game`, mas chamada repetidamente para
 * os mesmos jogos (catálogo estático é reaproveitado entre renders). */
const gameTagsCache = new WeakMap<GameDefinition, SkillTag[]>();

/** Reúne todas as tags relevantes de um jogo (campo `tags` + tags dos payloads). */
export function gameTags(game: GameDefinition): SkillTag[] {
  const cached = gameTagsCache.get(game);
  if (cached) return cached;

  const set = new Set<SkillTag>(game.tags ?? []);
  const push = (tags?: SkillTag[]) => tags?.forEach((t) => set.add(t));
  game.duel?.rounds.forEach((r) => push(r.tags));
  game.escalation?.ladders.forEach((l) => push(l.tags));
  game.artificiality?.rounds.forEach((r) => push(r.tags));
  game.corrector?.cases.forEach((c) => push(c.tags));
  game.essayCollapse?.rounds.forEach((r) => push(r.tags));
  game.textSurgery?.cases.forEach((c) =>
    c.segments.forEach((s) => {
      if (typeof s !== "string") push(s.tags);
    }),
  );
  const tags = [...set];
  gameTagsCache.set(game, tags);
  return tags;
}

/** Maestria (0–100) de uma tag: 100 quando sem erros; cai com a taxa de erro. (legado) */
export function masteryFor(profile: SkillProfile, tag: SkillTag): number {
  const stat = profile[tag];
  if (!stat || stat.attempts === 0) return 0;
  return Math.round(((stat.attempts - stat.errors) / stat.attempts) * 100);
}

/** Maestria média de um conjunto de tags (ignora tags nunca praticadas). (legado) */
export function masteryForTags(profile: SkillProfile, tags: SkillTag[]): number | null {
  const seen = tags.filter((t) => profile[t]?.attempts);
  if (seen.length === 0) return null;
  return Math.round(seen.reduce((sum, t) => sum + masteryFor(profile, t), 0) / seen.length);
}

/** Fraquezas ordenadas por nº de erros e taxa de erro (mais fraco primeiro). (legado) */
export function topWeaknesses(profile: SkillProfile): { tag: SkillTag; errors: number; rate: number }[] {
  return (Object.entries(profile) as [SkillTag, SkillStat][])
    .filter(([, s]) => s.attempts > 0 && s.errors > 0)
    .map(([tag, s]) => ({ tag, errors: s.errors, rate: s.errors / s.attempts }))
    .sort((a, b) => b.rate - a.rate || b.errors - a.errors);
}

/**
 * Recomenda treinos por interseção de tags com as fraquezas legadas. Sem dados, cai para maior XP.
 * (Mantido para compat; o treinador principal usa `recommendHub` em `adaptive.ts`.)
 */
export function recommendTrainings(games: GameDefinition[], profile: SkillProfile, limit = 4): GameDefinition[] {
  const weak = new Map(topWeaknesses(profile).map((w) => [w.tag, w.rate]));
  return [...games]
    .map((game) => {
      const tags = gameTags(game);
      const score = tags.reduce((sum, t) => sum + (weak.get(t) ?? 0), 0);
      return { game, score };
    })
    .sort((a, b) => b.score - a.score || b.game.xpReward - a.game.xpReward)
    .slice(0, limit)
    .map((entry) => entry.game);
}

/** Jogos pertinentes a um hub de sintoma (interseção de tags). */
export function gamesForHub(games: GameDefinition[], hub: SymptomHub): GameDefinition[] {
  const wanted = new Set(hub.tags);
  return games.filter((game) => gameTags(game).some((t) => wanted.has(t)));
}
