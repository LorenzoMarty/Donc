import type { GameQuestion } from "@/features/gamification/types";

/**
 * Embaralha as alternativas de uma questão (Fisher-Yates) e recalcula o
 * `answerIndex` para continuar apontando para a alternativa correta.
 * Elimina o padrão de "resposta sempre na 1ª posição".
 */
export function shuffleQuestionOptions(question: GameQuestion): GameQuestion {
  const correct = question.options[question.answerIndex];
  const options = [...question.options];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  const answerIndex = options.indexOf(correct);
  return { ...question, options, answerIndex: answerIndex === -1 ? question.answerIndex : answerIndex };
}
