"use client";

import { Sparkles } from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { QuizSession } from "@/games/_engines/QuizSession";
import type { GameCategory, GameCategoryId, GameDefinition, GameDifficulty } from "@/features/gamification/types";
import type { GameQuestion as AdminGameQuestion } from "@/types/api";

const CATEGORY_LABELS: Record<string, string> = {
  coesao: "Coesão",
  argumentacao: "Argumentação",
  estrutura: "Estrutura",
  repertorio: "Repertório",
  gramatica: "Gramática",
  "competencias-enem": "Competências ENEM",
};

const DIFFICULTY_LABELS: Record<string, GameDifficulty> = {
  easy: "Essencial",
  medium: "Intermediario",
  hard: "Avancado",
};

/**
 * REQ-8 (P3a): preview do jogo em edição reusando o engine real (`QuizSession`, o mesmo que o
 * aluno usa) — nunca uma tela de leitura separada. `preview=true` garante que nada é persistido
 * (sem GameAttempt, sem sinal adaptativo, sem trackEvent).
 */
export function GamePreviewModal({
  open,
  onClose,
  name,
  category,
  skill,
  difficulty,
  questions,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  category: string;
  skill: string;
  difficulty: string;
  questions: AdminGameQuestion[];
}) {
  if (!open) return null;

  const categoryId = (category as GameCategoryId) || "coesao";
  const previewCategory: GameCategory = {
    id: categoryId,
    slug: categoryId,
    name: CATEGORY_LABELS[category] ?? category,
    description: "",
    icon: Sparkles,
    progress: 0,
    secondaryColor: "",
    gameCount: 0,
    masteryLevel: "",
  };

  const previewGame: GameDefinition = {
    id: "preview",
    name: name || "Pré-visualização",
    category: categoryId,
    description: "",
    difficulty: DIFFICULTY_LABELS[difficulty] ?? "Intermediario",
    estimatedTime: "",
    thumbnail: "",
    progress: 0,
    unlocked: true,
    engine: "quiz",
    skill,
    questions: questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: q.options,
      answerIndex: q.answer_index,
      explanation: q.explanation,
    })),
    hubs: [],
    skills: [],
    tags: [],
    cognitiveFocus: [],
    possibleEvents: [],
  };

  return (
    <Modal open={open} onClose={onClose} title="Pré-visualização" description="Exatamente como o aluno vai ver — nada aqui é salvo." size="xl">
      <QuizSession game={previewGame} category={previewCategory} preview onExit={onClose} />
    </Modal>
  );
}
