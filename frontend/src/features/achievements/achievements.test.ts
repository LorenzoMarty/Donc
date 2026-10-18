import { describe, expect, it } from "vitest";

import { computeAchievements } from "@/features/achievements/achievements";

const empty = { streak_days: 0, essays_written: 0, best_essay_score: 0, completed_lessons: 0, trend: [] };

const earnedIds = (input: Parameters<typeof computeAchievements>[0]) =>
  computeAchievements(input)
    .filter((item) => item.earned)
    .map((item) => item.id);

describe("computeAchievements", () => {
  it("earns nothing for a brand new student", () => {
    expect(earnedIds(empty)).toEqual([]);
  });

  it("unlocks streak milestones cumulatively", () => {
    expect(earnedIds({ ...empty, streak_days: 7 })).toEqual(["streak-3", "streak-7"]);
    expect(earnedIds({ ...empty, streak_days: 30 })).toEqual(["streak-3", "streak-7", "streak-30"]);
  });

  it("unlocks first essay, first lesson and 700+ score", () => {
    expect(earnedIds({ ...empty, essays_written: 1, completed_lessons: 2, best_essay_score: 720 })).toEqual([
      "first-essay",
      "first-lesson",
      "score-700",
    ]);
  });

  it("needs a 50-point gain between first and last corrected essay for evolution", () => {
    const trend = (scores: number[]) => scores.map((score, index) => ({ label: String(index), score }));
    expect(earnedIds({ ...empty, trend: trend([600, 640]) })).not.toContain("score-evolution");
    expect(earnedIds({ ...empty, trend: trend([600, 580, 660]) })).toContain("score-evolution");
    expect(earnedIds({ ...empty, trend: trend([650]) })).not.toContain("score-evolution");
  });
});
