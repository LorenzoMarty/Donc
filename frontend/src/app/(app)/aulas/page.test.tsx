import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import LessonsPage from "@/app/(app)/aulas/page";
import type { Dashboard, Module } from "@/services/api";

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

const MODULES: Module[] = [
  {
    id: 1,
    title: "Módulo 1",
    slug: "modulo-1",
    description: "desc",
    color: "#65be02",
    order: 1,
    progress_percent: 40,
    completed: false,
    xp_reward: 75,
    user_rank: null,
    lessons: [LESSON],
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
      if (path === "/lessons/modules") return Promise.resolve(MODULES);
      if (path === "/dashboard") return Promise.resolve(DASHBOARD);
      return Promise.reject(new Error(`unexpected path ${path}`));
    }),
  };
});

describe("LessonsPage — trilhas de aprendizado (fiel a Aulas.dc.html)", () => {
  it("mostra o card da trilha e a aula recente", async () => {
    render(<LessonsPage />);

    expect((await screen.findAllByText("Módulo 1")).length).toBeGreaterThan(0);
    expect(screen.getByText("Trilhas de aprendizado")).toBeInTheDocument();
    expect(screen.getByText("Aulas recentes")).toBeInTheDocument();
    expect(screen.getAllByText("Introdução à tese").length).toBeGreaterThan(0);
  });
});
