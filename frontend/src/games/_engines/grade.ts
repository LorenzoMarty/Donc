import type { Grade } from "@/features/gamification/types";

/** Pontos por grade (S é o teto). Usado para converter feedback qualitativo em score. */
export function gradeToPoints(grade: Grade): number {
  switch (grade) {
    case "S":
      return 4;
    case "A":
      return 3;
    case "B":
      return 2;
    case "C":
      return 1;
    default:
      return 0;
  }
}

export const GRADE_LABEL: Record<Grade, string> = {
  S: "Excelente",
  A: "Muito bom",
  B: "Aceitável",
  C: "Fraco",
  Fraco: "Insuficiente",
};

/** Cor de realce por grade (classes Tailwind). */
export const GRADE_TONE: Record<Grade, string> = {
  S: "border-emerald-500/55 bg-emerald-500/10 text-emerald-800",
  A: "border-emerald-500/40 bg-emerald-500/5 text-emerald-800",
  B: "border-amber-500/45 bg-amber-500/10 text-amber-800",
  C: "border-orange-500/45 bg-orange-500/10 text-orange-800",
  Fraco: "border-destructive/50 bg-destructive/10 text-red-800",
};

/**
 * Converte uma sequência de grades em { score, total } para alimentar `completeGame`
 * sem alterar o store. total = nº de decisões × 4 (pontuação máxima por decisão).
 */
export function summariseGrades(grades: Grade[]): { score: number; total: number } {
  const total = grades.length * 4;
  const score = grades.reduce((sum, g) => sum + gradeToPoints(g), 0);
  return { score, total };
}

/** Converte uma nota 0–4 (média) na grade correspondente. */
export function pointsToGrade(points: number): Grade {
  if (points >= 3.5) return "S";
  if (points >= 2.5) return "A";
  if (points >= 1.5) return "B";
  if (points >= 0.5) return "C";
  return "Fraco";
}
