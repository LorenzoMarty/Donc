import type { Dashboard, EssayHistory, LearningProfile } from "@/types/api";

/**
 * Transformador puro do "Raio-X do escritor": funde o agregado do dashboard (notas por
 * competência + evolução) com o StudentLearningProfile (fraquezas, erros, repertórios,
 * recomendações) num view-model pronto para render. Sem React, sem fetch — testável isolado.
 */

const COMPETENCY_LABELS: Record<string, string> = {
  c1: "Norma culta",
  c2: "Compreensão do tema",
  c3: "Argumentação",
  c4: "Coesão",
  c5: "Proposta de intervenção",
};

export function competencyLabel(code: string): string {
  return COMPETENCY_LABELS[code.toLowerCase()] ?? code.toUpperCase();
}

export type WeakCompetency = { code: string; label: string; count: number };

export type WriterXray = {
  competencyBars: { competency: string; value: number }[];
  trend: { label: string; score: number }[];
  competencyTrend: { label: string; c1: number; c2: number; c3: number; c4: number; c5: number }[];
  weakCompetencies: WeakCompetency[];
  recurringErrors: string[];
  recommendations: string[];
  repertories: string[];
  hasScores: boolean;
  hasTrend: boolean;
  hasCompetencyTrend: boolean;
  hasProfileData: boolean;
  isEmpty: boolean;
};

export function buildWriterXray({
  dashboard,
  learningProfile,
  essayHistory,
}: {
  dashboard: Dashboard | null;
  learningProfile: LearningProfile | null;
  essayHistory?: EssayHistory | null;
}): WriterXray {
  const competencyBars = (dashboard?.mastery_map ?? []).map((item) => ({
    competency: item.competency,
    value: item.value,
  }));
  const trend = dashboard?.trend ?? [];
  const competencyTrend = (essayHistory?.evolution ?? []).map((point) => ({
    label: point.label,
    c1: point.c1,
    c2: point.c2,
    c3: point.c3,
    c4: point.c4,
    c5: point.c5,
  }));

  const weakCompetencies = Object.entries(learningProfile?.weak_competencies ?? {})
    .map(([code, count]) => ({ code, label: competencyLabel(code), count: Number(count) || 0 }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);

  // Erros recorrentes: preferir a fonte de IA (learning_profile), cair para o agregado do dashboard.
  const recurringErrors =
    learningProfile?.recurring_errors?.length ? learningProfile.recurring_errors : dashboard?.recurrent_errors ?? [];

  const recommendations = learningProfile?.recommendations ?? [];
  const repertories = learningProfile?.repertories_used ?? [];

  const hasScores = competencyBars.some((bar) => bar.value > 0);
  const hasTrend = trend.length > 0;
  const hasCompetencyTrend = competencyTrend.length > 0;
  const hasProfileData = Boolean(
    learningProfile?.has_data || weakCompetencies.length || recurringErrors.length || recommendations.length || repertories.length,
  );

  return {
    competencyBars,
    trend,
    competencyTrend,
    weakCompetencies,
    recurringErrors,
    recommendations,
    repertories,
    hasScores,
    hasTrend,
    hasCompetencyTrend,
    hasProfileData,
    isEmpty: !hasScores && !hasTrend && !hasProfileData,
  };
}
