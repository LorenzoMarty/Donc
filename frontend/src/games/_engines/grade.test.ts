import { describe, it, expect } from "vitest";

import { gradeToPoints, pointsToGrade, summariseGrades, GRADE_LABEL } from "@/games/_engines/grade";
import type { Grade } from "@/features/gamification/types";

describe("feedback qualitativo S/A/B/C", () => {
  it("gradeToPoints segue a hierarquia S>A>B>C>Fraco", () => {
    expect(gradeToPoints("S")).toBe(4);
    expect(gradeToPoints("A")).toBe(3);
    expect(gradeToPoints("B")).toBe(2);
    expect(gradeToPoints("C")).toBe(1);
    expect(gradeToPoints("Fraco")).toBe(0);
  });

  it("pointsToGrade aplica os limiares corretos", () => {
    expect(pointsToGrade(4)).toBe("S");
    expect(pointsToGrade(3)).toBe("A");
    expect(pointsToGrade(2)).toBe("B");
    expect(pointsToGrade(1)).toBe("C");
    expect(pointsToGrade(0)).toBe("Fraco");
  });

  it("é round-trip estável para cada grade", () => {
    const grades: Grade[] = ["S", "A", "B", "C", "Fraco"];
    for (const g of grades) {
      expect(pointsToGrade(gradeToPoints(g))).toBe(g);
    }
  });

  it("summariseGrades soma pontos e total corretos", () => {
    const { score, total } = summariseGrades(["S", "A", "C"]);
    expect(total).toBe(12); // 3 decisões × 4
    expect(score).toBe(4 + 3 + 1);
  });

  it("todo grade tem um rótulo qualitativo (nunca 'correto/errado')", () => {
    for (const g of ["S", "A", "B", "C", "Fraco"] as Grade[]) {
      expect(GRADE_LABEL[g]).toBeTruthy();
      expect(GRADE_LABEL[g].toLowerCase()).not.toContain("errado");
    }
  });
});
