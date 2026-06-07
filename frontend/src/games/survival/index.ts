import type { GameDefinition } from "@/features/gamification/types";

export const survivalGames: GameDefinition[] = [
  {
    id: "survival-marathon",
    name: "Modo Sobrevivência",
    category: "desafios-diarios",
    description: "Maratona de 30 decisões agregadas de todas as habilidades. Timer agressivo, 5 vidas e combo que multiplica o XP. Quanto mais longe, mais difícil.",
    difficulty: "Avancado",
    xpReward: 120,
    estimatedTime: "10 min",
    thumbnail: "survival",
    progress: 0,
    unlocked: true,
    engine: "survival",
    skill: "Resistência cognitiva",
    tags: ["c1", "c3", "c4"],
    survival: { poolGameIds: [] },
  },
];
