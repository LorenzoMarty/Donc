import { Bot, Repeat, Library, Layers, PenLine, Target, Flag } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { GameDefinition, SkillTag } from "@/features/gamification/types";

/** Perfil adaptativo: por tag, quantas tentativas e quantos erros o aluno acumulou. */
export type SkillStat = { attempts: number; errors: number };
export type SkillProfile = Partial<Record<SkillTag, SkillStat>>;

/** Hub orientado por sintoma — o que o aluno "sente" que está errado na escrita dele. */
export type SymptomHub = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tags: SkillTag[];
  accent: string;
};

export const symptomHubs: SymptomHub[] = [
  {
    id: "texto-robotico",
    title: "Seu texto parece robótico",
    description: "Frases artificiais, conectivos colados e ar de fórmula pronta. Treine naturalidade e autenticidade.",
    icon: Bot,
    tags: ["texto-robotico", "conectivo-artificial", "abstracao-excessiva"],
    accent: "hsl(215 100% 61%)",
  },
  {
    id: "repete-ideias",
    title: "Você repete ideias",
    description: "O texto anda em círculos: mesma palavra, mesmo argumento. Treine progressão e variação lexical.",
    icon: Repeat,
    tags: ["repeticao-lexical", "progressao-fraca"],
    accent: "hsl(134 61% 41%)",
  },
  {
    id: "repertorio-nao-encaixa",
    title: "Seu repertório não encaixa",
    description: "Citações decorativas que não dialogam com o tema. Treine pertinência e articulação do repertório.",
    icon: Library,
    tags: ["repertorio-decorativo", "c2"],
    accent: "hsl(0 0% 20%)",
  },
  {
    id: "nao-aprofunda",
    title: "Seu texto não aprofunda",
    description: "Argumentação rasa, presa na superfície. Treine a escalada do raciocínio até a complexidade.",
    icon: Layers,
    tags: ["argumentacao-rasa", "abstracao-excessiva"],
    accent: "hsl(262 60% 55%)",
  },
  {
    id: "introducao-sem-tese",
    title: "Sua introdução não cria tese",
    description: "Abre o texto sem ponto de vista delimitado. Treine a construção de teses defensáveis.",
    icon: PenLine,
    tags: ["introducao-sem-tese", "tese-vaga"],
    accent: "hsl(354 70% 54%)",
  },
  {
    id: "perde-na-c3",
    title: "Você perde na Competência 3",
    description: "Ideias sem projeto de texto nem progressão. Treine seleção, organização e encadeamento.",
    icon: Target,
    tags: ["c3", "progressao-fraca", "argumentacao-rasa"],
    accent: "hsl(28 90% 52%)",
  },
  {
    id: "conclusao-formula",
    title: "Sua conclusão é fórmula pronta",
    description: "Intervenção incompleta e fechamento clichê. Treine propostas completas (Competência 5).",
    icon: Flag,
    tags: ["conclusao-formula", "intervencao-incompleta", "c5"],
    accent: "hsl(190 80% 40%)",
  },
];

export function getSymptomHub(id: string): SymptomHub | undefined {
  return symptomHubs.find((hub) => hub.id === id);
}

/** Reúne todas as tags relevantes de um jogo (campo `tags` + tags dos payloads). */
export function gameTags(game: GameDefinition): SkillTag[] {
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
  return [...set];
}

/** Maestria (0–100) de uma tag: 100 quando sem erros; cai com a taxa de erro. */
export function masteryFor(profile: SkillProfile, tag: SkillTag): number {
  const stat = profile[tag];
  if (!stat || stat.attempts === 0) return 0;
  return Math.round(((stat.attempts - stat.errors) / stat.attempts) * 100);
}

/** Maestria média de um conjunto de tags (ignora tags nunca praticadas). */
export function masteryForTags(profile: SkillProfile, tags: SkillTag[]): number | null {
  const seen = tags.filter((t) => profile[t]?.attempts);
  if (seen.length === 0) return null;
  return Math.round(seen.reduce((sum, t) => sum + masteryFor(profile, t), 0) / seen.length);
}

/** Fraquezas ordenadas por nº de erros e taxa de erro (mais fraco primeiro). */
export function topWeaknesses(profile: SkillProfile): { tag: SkillTag; errors: number; rate: number }[] {
  return (Object.entries(profile) as [SkillTag, SkillStat][])
    .filter(([, s]) => s.attempts > 0 && s.errors > 0)
    .map(([tag, s]) => ({ tag, errors: s.errors, rate: s.errors / s.attempts }))
    .sort((a, b) => b.rate - a.rate || b.errors - a.errors);
}

/**
 * Recomenda treinos: prioriza jogos cujas tags cruzam com as fraquezas do aluno.
 * Sem dados, cai para os de maior XP (mais profundos).
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
