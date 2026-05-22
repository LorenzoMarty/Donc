import type { GameDefinition } from "@/features/gamification/types";

export const thesisGames: GameDefinition[] = [
  {
    id: "thesis-lab",
    name: "Laboratorio de tese",
    category: "argumentacao",
    description: "Compare formulacoes e escolha a tese mais clara, defensavel e produtiva.",
    difficulty: "Essencial",
    xpReward: 48,
    estimatedTime: "4 min",
    thumbnail: "argumentacao-tese",
    progress: 0,
    unlocked: true,
    engine: "quiz",
    skill: "Argumentacao",
    questions: [
      {
        id: "q1",
        prompt: "Tema: leitura critica entre jovens. Qual tese orienta melhor a redacao?",
        options: [
          "A baixa leitura critica fragiliza a autonomia juvenil e amplia a vulnerabilidade a desinformacao.",
          "Ler e muito importante para todos.",
          "Os jovens usam internet.",
          "A escola existe para ensinar.",
        ],
        answerIndex: 0,
        explanation: "A tese delimita problema, consequencia e eixo argumentativo.",
      },
      {
        id: "q2",
        prompt: "Qual tese evita generalizacao vazia?",
        options: [
          "A ausencia de educacao midiática na escola dificulta a verificacao de fontes pelos estudantes.",
          "Tudo e culpa da sociedade.",
          "O Brasil sempre teve problemas.",
          "A tecnologia e boa e ruim.",
        ],
        answerIndex: 0,
        explanation: "Ela aponta recorte, causa e efeito analisavel.",
      },
    ],
  },
  {
    id: "argument-map",
    name: "Mapa argumentativo",
    category: "argumentacao",
    description: "Organize causa, consequencia e responsabilidade antes de escrever.",
    difficulty: "Intermediario",
    xpReward: 62,
    estimatedTime: "5 min",
    thumbnail: "argumentacao-mapa",
    progress: 0,
    unlocked: true,
    engine: "sequence",
    skill: "Argumentacao",
    questions: [
      {
        id: "q1",
        prompt: "Para um paragrafo sobre exclusao digital, qual ordem argumentativa e mais forte?",
        options: [
          "Causa > consequencia > exemplo",
          "Exemplo solto > conclusao > tema",
          "Citacao > citacao > citacao",
          "Proposta > introducao > causa",
        ],
        answerIndex: 0,
        explanation: "Essa ordem conduz o leitor da origem do problema ao impacto concreto.",
      },
    ],
  },
];
