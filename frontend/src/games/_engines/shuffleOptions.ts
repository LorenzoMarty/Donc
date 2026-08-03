import type { GameQuestion } from "@/features/gamification/types";

/** Embaralha um array (Fisher-Yates), sem mutar o original. */
export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Embaralha as alternativas de uma questão (Fisher-Yates) e recalcula o
 * `answerIndex` para continuar apontando para a alternativa correta.
 * Elimina o padrão de "resposta sempre na 1ª posição".
 */
export function shuffleQuestionOptions(question: GameQuestion): GameQuestion {
  const correct = question.options[question.answerIndex];
  const options = shuffle(question.options);
  const answerIndex = options.indexOf(correct);
  return { ...question, options, answerIndex: answerIndex === -1 ? question.answerIndex : answerIndex };
}
