import type { GameDefinition } from "@/features/gamification/types";

export const grammarGames: GameDefinition[] = [
  {
    id: "grammar-hunt",
    name: "Caca ao desvio",
    category: "gramatica",
    description: "Encontre desvios de concordancia, pontuacao e regencia em trechos de redacao.",
    difficulty: "Essencial",
    xpReward: 46,
    estimatedTime: "4 min",
    thumbnail: "gramatica-revisao",
    progress: 0,
    unlocked: true,
    rarity: "comum",
    engine: "quiz",
    skill: "Gramatica",
    questions: [
      {
        id: "q1",
        prompt: "Qual frase apresenta desvio de concordancia?",
        options: ["Os jovens precisa de orientacao critica.", "A escola deve mediar leituras.", "As redes influenciam habitos.", "O estudante revisa o texto."],
        answerIndex: 0,
        explanation: "O sujeito plural 'jovens' exige 'precisam'.",
      },
      {
        id: "q2",
        prompt: "Qual trecho exige virgula depois do deslocamento inicial?",
        options: ["Ao analisar o problema percebe-se a falha.", "A escola amplia repertorios.", "O governo investe em leitura.", "Jovens acessam redes sociais."],
        answerIndex: 0,
        explanation: "A oracao deslocada 'Ao analisar o problema' deve ser isolada por virgula.",
      },
    ],
  },
  {
    id: "punctuation-focus",
    name: "Pontuacao de impacto",
    category: "gramatica",
    description: "Use virgulas e ponto e virgula para aumentar clareza argumentativa.",
    difficulty: "Intermediario",
    xpReward: 54,
    estimatedTime: "5 min",
    thumbnail: "gramatica-pontuacao",
    progress: 0,
    unlocked: true,
    rarity: "raro",
    engine: "quiz",
    skill: "Pontuacao",
    questions: [
      {
        id: "q1",
        prompt: "Qual alternativa pontua melhor o deslocamento?",
        options: ["Nesse contexto, a escola deve atuar.", "Nesse contexto a escola, deve atuar.", "Nesse, contexto a escola deve atuar.", "Nesse contexto a escola deve, atuar."],
        answerIndex: 0,
        explanation: "A virgula apos o adjunto deslocado melhora a leitura.",
      },
    ],
  },
];
