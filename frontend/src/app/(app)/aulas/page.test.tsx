import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import LessonsPage from "@/app/(app)/aulas/page";
import type { Course, Dashboard } from "@/services/api";

const LESSON = {
  id: 1,
  title: "Introdução à tese",
  description: "desc",
  thumbnail_url: "default.jpg",
  video_url: "",
  summary: "",
  pdf_url: null,
  duration_minutes: 8,
  order: 1,
  xp_reward: 50,
  progress: { progress_percent: 0, last_position_seconds: 0, completed: false },
  exercises: [],
};

const COURSES: Course[] = [
  {
    id: 1,
    title: "Redação ENEM do zero",
    slug: "redacao-enem",
    description: "Curso principal",
    color: "#65be02",
    progress_percent: 40,
    completed: false,
    xp_reward: 200,
    user_rank: null,
    modules: [
      {
        id: 1,
        title: "Módulo 1",
        description: "desc",
        order: 1,
        progress_percent: 40,
        completed: false,
        xp_reward: 75,
        lessons: [LESSON],
      },
    ],
  },
];

const DASHBOARD: Dashboard = {
  progress_general: 40,
  essay_average: 700,
  best_essay_score: 800,
  streak_days: 3,
  xp: 500,
  level: 2,
  completed_lessons: 1,
  correct_exercises_rate: 70,
  essays_written: 2,
  mastery_map: [],
  recurrent_errors: [],
  trend: [],
  recent_lessons: [{ id: 1, title: "Introdução à tese", module: "Módulo 1", progress_percent: 55 }],
  pending_exercises: [],
  recent_exams: [],
  recent_essays: [],
  suggested_lessons: [{ id: 2, title: "Conectivos essenciais", module: "Módulo 1", progress_percent: 0 }],
  goals: [],
};

vi.mock("@/services/api", async () => {
  const actual = await vi.importActual<typeof import("@/services/api")>("@/services/api");
  return {
    ...actual,
    apiFetch: vi.fn((path: string) => {
      if (path === "/lessons/courses") return Promise.resolve(COURSES);
      if (path === "/dashboard") return Promise.resolve(DASHBOARD);
      return Promise.reject(new Error(`unexpected path ${path}`));
    }),
  };
});

describe("LessonsPage — catálogo estilo streaming", () => {
  it("mostra hero do curso em andamento, rail de continuar assistindo e de recomendados", async () => {
    render(<LessonsPage />);

    expect((await screen.findAllByText("Redação ENEM do zero")).length).toBeGreaterThan(0);
    expect(screen.getByText("Continuar assistindo")).toBeInTheDocument();
    expect(screen.getByText("Recomendado pra você")).toBeInTheDocument();
    expect(screen.getAllByText("Introdução à tese").length).toBeGreaterThan(0);
    expect(screen.getByText("Conectivos essenciais")).toBeInTheDocument();
  });
});
