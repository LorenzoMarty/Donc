import type { GameDefinition } from "@/features/gamification/types";

export const repertoireGames: GameDefinition[] = [
  {
    id: "repertoire-match",
    name: "Repertorio em contexto",
    category: "repertorio",
    description: "Associe autores, obras e conceitos a problemas sociais do ENEM.",
    difficulty: "Intermediario",
    xpReward: 64,
    estimatedTime: "5 min",
    thumbnail: "repertorio-contexto",
    progress: 0,
    unlocked: true,
    rarity: "raro",
    engine: "choice",
    skill: "Repertorio",
    questions: [
      {
        id: "q1",
        prompt: "Qual repertorio se conecta melhor ao tema de manipulacao informacional por algoritmos?",
        options: ["Cambridge Analytica", "Revolta da Vacina", "Arcadismo", "Tratado de Tordesilhas"],
        answerIndex: 0,
        explanation: "O caso ilustra uso de dados e direcionamento de mensagens no ambiente digital.",
      },
      {
        id: "q2",
        prompt: "Para discutir desigualdade urbana e acesso a direitos, qual autor e mais produtivo?",
        options: ["Milton Santos", "Gregor Mendel", "Pero Vaz de Caminha", "Euclides da Cunha apenas como biografia"],
        answerIndex: 0,
        explanation: "Milton Santos ajuda a pensar territorio, cidadania e distribuicao desigual de recursos.",
      },
    ],
  },
  {
    id: "cultural-bridge",
    name: "Ponte sociocultural",
    category: "repertorio",
    description: "Escolha como conectar repertorio ao argumento sem citacao decorativa.",
    difficulty: "Avancado",
    xpReward: 76,
    estimatedTime: "6 min",
    thumbnail: "repertorio-ponte",
    progress: 0,
    unlocked: true,
    rarity: "epico",
    engine: "quiz",
    skill: "Repertorio",
    questions: [
      {
        id: "q1",
        prompt: "Qual uso de repertorio e mais produtivo?",
        options: [
          "Segundo Bauman, relacoes instaveis ajudam a explicar fragilidade dos vinculos digitais.",
          "Bauman nasceu em 1925 e isso prova tudo.",
          "A Constituicao existe.",
          "No passado era diferente.",
        ],
        answerIndex: 0,
        explanation: "O repertorio precisa interpretar o problema, nao apenas aparecer como mencao solta.",
      },
    ],
  },
];
