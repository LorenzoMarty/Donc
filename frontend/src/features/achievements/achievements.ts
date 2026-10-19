import type { Dashboard } from "@/types/api";

export type Achievement = { id: string; title: string; description: string; earned: boolean };

type Input = Pick<Dashboard, "streak_days" | "essays_written" | "best_essay_score" | "completed_lessons" | "trend">;

const STREAK_MILESTONES = [3, 7, 30] as const;
/** Ganho mínimo (em pontos) entre a mais antiga e a mais recente das últimas redações corrigidas (a janela do
 * dashboard, `trend`, tem as 6 últimas) para contar como evolução. */
const SCORE_GAIN = 50;

/** Conquistas simples derivadas do dashboard (sem XP de conta nem estado novo no servidor). */
export function computeAchievements(data: Input): Achievement[] {
  const scores = (data.trend ?? []).map((point) => point.score).filter((score) => score > 0);
  const evolved = scores.length >= 2 && scores[scores.length - 1] - scores[0] >= SCORE_GAIN;

  return [
    ...STREAK_MILESTONES.map((days) => ({
      id: `streak-${days}`,
      title: `${days} dias seguidos`,
      description: `Estudou ${days} dias em sequência.`,
      earned: data.streak_days >= days,
    })),
    { id: "first-essay", title: "Primeira redação", description: "Enviou sua primeira redação.", earned: data.essays_written >= 1 },
    { id: "first-lesson", title: "Primeira aula", description: "Concluiu sua primeira aula.", earned: data.completed_lessons >= 1 },
    { id: "score-700", title: "Nota 700+", description: "Passou dos 700 pontos em uma redação.", earned: data.best_essay_score >= 700 },
    { id: "score-evolution", title: "Evolução de nota", description: `Subiu ${SCORE_GAIN} pontos ou mais nas suas últimas redações.`, earned: evolved },
  ];
}
