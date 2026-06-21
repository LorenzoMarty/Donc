import { describe, it, expect } from "vitest";

import { buildWriterXray, competencyLabel } from "@/features/profile/writer-xray";
import type { Dashboard, LearningProfile } from "@/types/api";

function fakeDashboard(overrides: Partial<Dashboard> = {}): Dashboard {
  return {
    progress_general: 0,
    essay_average: 0,
    best_essay_score: 0,
    streak_days: 0,
    xp: 0,
    level: 1,
    completed_lessons: 0,
    correct_exercises_rate: 0,
    essays_written: 0,
    mastery_map: [],
    recurrent_errors: [],
    trend: [],
    recent_lessons: [],
    pending_exercises: [],
    recent_exams: [],
    recent_essays: [],
    suggested_lessons: [],
    goals: [],
    ...overrides,
  };
}

function fakeProfile(overrides: Partial<LearningProfile> = {}): LearningProfile {
  return {
    weak_competencies: {},
    recurring_errors: [],
    repertories_used: [],
    recommendations: [],
    has_data: false,
    ...overrides,
  };
}

describe("competencyLabel", () => {
  it("mapeia códigos c1..c5 para rótulos pt-BR", () => {
    expect(competencyLabel("c3")).toBe("Argumentação");
    expect(competencyLabel("C5")).toBe("Proposta de intervenção");
  });

  it("cai para o código em maiúsculas quando desconhecido", () => {
    expect(competencyLabel("c9")).toBe("C9");
  });
});

describe("buildWriterXray", () => {
  it("marca isEmpty quando não há dados em lugar nenhum", () => {
    const xray = buildWriterXray({ dashboard: null, learningProfile: null });
    expect(xray.isEmpty).toBe(true);
    expect(xray.hasScores).toBe(false);
    expect(xray.hasProfileData).toBe(false);
  });

  it("ordena competências fracas por contagem desc e adiciona rótulo", () => {
    const xray = buildWriterXray({
      dashboard: null,
      learningProfile: fakeProfile({ weak_competencies: { c1: 2, c3: 5 }, has_data: true }),
    });
    expect(xray.weakCompetencies.map((w) => w.code)).toEqual(["c3", "c1"]);
    expect(xray.weakCompetencies[0].label).toBe("Argumentação");
    expect(xray.hasProfileData).toBe(true);
    expect(xray.isEmpty).toBe(false);
  });

  it("prefere erros recorrentes do learning_profile sobre o dashboard", () => {
    const xray = buildWriterXray({
      dashboard: fakeDashboard({ recurrent_errors: ["erro do dashboard"] }),
      learningProfile: fakeProfile({ recurring_errors: ["erro do perfil"], has_data: true }),
    });
    expect(xray.recurringErrors).toEqual(["erro do perfil"]);
  });

  it("usa erros do dashboard quando o learning_profile não tem", () => {
    const xray = buildWriterXray({
      dashboard: fakeDashboard({ recurrent_errors: ["erro do dashboard"] }),
      learningProfile: fakeProfile(),
    });
    expect(xray.recurringErrors).toEqual(["erro do dashboard"]);
  });

  it("deriva competencyBars e flags de notas a partir do mastery_map", () => {
    const xray = buildWriterXray({
      dashboard: fakeDashboard({
        mastery_map: [{ competency: "C3", label: "Argumentação", value: 160 }],
        trend: [{ label: "01/06", score: 820 }],
      }),
      learningProfile: null,
    });
    expect(xray.competencyBars).toEqual([{ competency: "C3", value: 160 }]);
    expect(xray.hasScores).toBe(true);
    expect(xray.hasTrend).toBe(true);
    expect(xray.isEmpty).toBe(false);
  });
});
