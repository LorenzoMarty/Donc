import { describe, expect, it } from "vitest";

import { flattenExercises } from "./exercises";
import type { AdminActivity, AdminModule } from "@/types/api";

function activity(overrides: Partial<AdminActivity> = {}): AdminActivity {
  return {
    id: 1,
    statement: "Enunciado",
    options: ["A", "B", "C", "D", "E"],
    correct_answer: "A",
    explanation: "Explicação",
    skill: "coesao",
    difficulty: "medium",
    lesson_id: null,
    base_lesson_ids: [],
    order: 1,
    targets: [],
    ...overrides,
  };
}

function moduleWithItems(id: number, title: string, activities: AdminActivity[]): AdminModule {
  return {
    id,
    title,
    slug: title.toLowerCase(),
    description: "",
    color: "#000000",
    order: id,
    lessons: [],
    items: activities.map((a, index) => ({ id: a.id, kind: "activity", order: index, lesson: null, activity: a })),
  };
}

describe("flattenExercises", () => {
  it("collects activities across modules, pairing each with its module", () => {
    const modules = [
      moduleWithItems(1, "Módulo A", [activity({ id: 10 })]),
      moduleWithItems(2, "Módulo B", [activity({ id: 20 }), activity({ id: 21 })]),
    ];

    const result = flattenExercises(modules);

    expect(result).toHaveLength(3);
    expect(result.map((r) => r.activity.id)).toEqual([10, 20, 21]);
    expect(result.find((r) => r.activity.id === 20)?.module.title).toBe("Módulo B");
  });

  it("ignores lesson items and modules with no activities", () => {
    const withLessonOnly: AdminModule = {
      id: 3,
      title: "Só aulas",
      slug: "so-aulas",
      description: "",
      color: "#000000",
      order: 3,
      lessons: [],
      items: [{ id: 1, kind: "lesson", order: 0, lesson: null, activity: null }],
    };

    expect(flattenExercises([withLessonOnly])).toEqual([]);
  });

  it("returns an empty list for modules with no items array (legacy shape without activities)", () => {
    const legacy: AdminModule = {
      id: 4,
      title: "Legado",
      slug: "legado",
      description: "",
      color: "#000000",
      order: 4,
      lessons: [],
    };

    expect(flattenExercises([legacy])).toEqual([]);
  });
});
