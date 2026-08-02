import { useMemo } from "react";

import type { GameQuestion } from "@/features/gamification/types";
import { shuffleQuestionOptions } from "@/games/_engines/shuffleOptions";

/**
 * Embaralha as alternativas via `shuffleQuestionOptions`, recalculando sempre que `resetKey`
 * mudar — não só quando `questions` muda. Sem o `resetKey`, o `useMemo` mantinha o mesmo
 * embaralhamento em replays que reaproveitam o componente já montado (ex.: botão "Repetir"),
 * fazendo a resposta certa parecer sempre na mesma posição em jogadas seguintes.
 */
export function useReshuffledQuestions(questions: GameQuestion[], resetKey: number): GameQuestion[] {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => questions.map(shuffleQuestionOptions), [questions, resetKey]);
}
