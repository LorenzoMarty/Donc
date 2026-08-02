import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useReshuffledQuestions } from "@/hooks/useReshuffledQuestions";
import * as shuffleOptions from "@/games/_engines/shuffleOptions";
import type { GameQuestion } from "@/features/gamification/types";

const QUESTIONS: GameQuestion[] = [
  { id: "q1", prompt: "P1", options: ["a", "b", "c", "d"], answerIndex: 0, explanation: "x" },
  { id: "q2", prompt: "P2", options: ["a", "b", "c", "d"], answerIndex: 0, explanation: "x" },
];

describe("useReshuffledQuestions", () => {
  it("reembaralha de novo quando resetKey muda (ex.: usuário clicou em 'Repetir')", () => {
    const shuffleSpy = vi.spyOn(shuffleOptions, "shuffleQuestionOptions");
    const { rerender } = renderHook(({ resetKey }) => useReshuffledQuestions(QUESTIONS, resetKey), {
      initialProps: { resetKey: 0 },
    });

    const callsAfterMount = shuffleSpy.mock.calls.length;
    expect(callsAfterMount).toBe(QUESTIONS.length);

    rerender({ resetKey: 1 });
    expect(shuffleSpy.mock.calls.length).toBe(callsAfterMount + QUESTIONS.length);
  });

  it("não reembaralha à toa quando resetKey não muda (evita trabalho/jitter a cada render)", () => {
    const shuffleSpy = vi.spyOn(shuffleOptions, "shuffleQuestionOptions");
    const { rerender } = renderHook(({ resetKey }) => useReshuffledQuestions(QUESTIONS, resetKey), {
      initialProps: { resetKey: 0 },
    });

    const callsAfterMount = shuffleSpy.mock.calls.length;
    rerender({ resetKey: 0 });
    expect(shuffleSpy.mock.calls.length).toBe(callsAfterMount);
  });
});
