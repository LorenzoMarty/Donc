import { describe, expect, it } from "vitest";

import { contentQualityTotal, countPublished, countRecentlyCreated } from "./overview-metrics";
import type { AdminContentQuality, AIGeneratedGame, EssayTheme } from "@/types/api";

function game(overrides: Partial<AIGeneratedGame> = {}): AIGeneratedGame {
  return {
    id: 1,
    name: "Jogo",
    category: "coesao",
    skill: "x",
    difficulty: "medium",
    engine: "quiz",
    questions: [],
    payload: null,
    description: null,
    thumbnail: null,
    estimated_time: null,
    status: "pending",
    admin_notes: null,
    targets: [],
    edited_after_generation: false,
    created_at: "2026-08-01T00:00:00Z",
    reviewed_at: null,
    ...overrides,
  };
}

function theme(overrides: Partial<EssayTheme> = {}): EssayTheme {
  return {
    id: 1,
    title: "Tema",
    context: "Contexto",
    source: "IA Donc",
    status: "pending",
    created_at: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

const EMPTY_QUALITY: AdminContentQuality = {
  lessons_without_target: [],
  exercises_without_target: [],
  games_without_target: [],
  unused_lessons: [],
  unused_exercises: [],
  unused_games: [],
  rejected_games: [],
  edited_games: [],
  content_by_issue: [],
};

describe("countPublished", () => {
  it("counts approved games and approved themes only", () => {
    const games = [game({ id: 1, status: "approved" }), game({ id: 2, status: "pending" })];
    const themes = [theme({ id: 1, status: "approved" }), theme({ id: 2, status: "rejected" })];

    expect(countPublished(games, themes)).toBe(2);
  });

  it("returns 0 when nothing is approved", () => {
    expect(countPublished([game({ status: "pending" })], [theme({ status: "pending" })])).toBe(0);
  });
});

describe("countRecentlyCreated", () => {
  const now = new Date("2026-08-13T12:00:00Z");

  it("counts games and themes created within the last 7 days", () => {
    const games = [game({ id: 1, created_at: "2026-08-10T00:00:00Z" })];
    const themes = [theme({ id: 1, created_at: "2026-08-13T00:00:00Z" })];

    expect(countRecentlyCreated(games, themes, now)).toBe(2);
  });

  it("excludes items created more than 7 days ago", () => {
    const games = [game({ id: 1, created_at: "2026-07-01T00:00:00Z" })];

    expect(countRecentlyCreated(games, [], now)).toBe(0);
  });
});

describe("contentQualityTotal", () => {
  it("sums all issue lists", () => {
    const quality: AdminContentQuality = {
      ...EMPTY_QUALITY,
      lessons_without_target: [{ id: 1, label: "a", kind: "lesson" }],
      rejected_games: [{ id: 2, label: "b", kind: "game" }],
    };

    expect(contentQualityTotal(quality)).toBe(2);
  });

  it("returns 0 when there are no issues", () => {
    expect(contentQualityTotal(EMPTY_QUALITY)).toBe(0);
  });
});
