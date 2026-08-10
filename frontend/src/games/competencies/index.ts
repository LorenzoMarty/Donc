import type { GameDefinition } from "@/features/gamification/types";

export const competencyGames: GameDefinition[] = [
  {
    id: "competency-diagnosis",
    name: "Diagnóstico de Competências",
    category: "competencias-enem",
    description:
      "Casos-limite: cada sintoma poderia tocar mais de uma competência. Identifique a competência PRINCIPALMENTE avaliada, segundo a matriz oficial.",
    difficulty: "Avancado",
    estimatedTime: "6 min",
    thumbnail: "competencias-diagnostico",
    progress: 0,
    unlocked: true,
    engine: "quiz",
    skill: "Matriz de correção",
    questions: [
      {
        id: "q1",
        prompt:
          "Uma redação usa conectivos corretos, mas repete a mesma ideia em todos os parágrafos, sem fazer o texto avançar. Qual competência é MAIS penalizada?",
        options: [
          "C3 — projeto de texto e progressão das ideias",
          "C4 — coesão",
          "C2 — compreensão do tema",
          "C1 — norma culta",
        ],
        answerIndex: 0,
        explanation: "Conectivos corretos preservam a C4; o problema é a falta de progressão/seleção de informações — núcleo da C3.",
      },
      {
        id: "q2",
        prompt:
          "O texto cita um repertório legítimo, mas totalmente desligado do recorte temático. O maior prejuízo recai sobre:",
        options: [
          "C2 — repertório produtivo e pertinência ao tema",
          "C3 — argumentação",
          "C5 — proposta de intervenção",
          "C4 — coesão",
        ],
        answerIndex: 0,
        explanation: "Repertório legitimado mas improdutivo (não articulado ao tema) é avaliado pela C2.",
      },
      {
        id: "q3",
        prompt:
          "A proposta de intervenção é detalhada e completa, mas fere os direitos humanos. Qual é a consequência na matriz?",
        options: [
          "C5 zerada por desrespeito aos direitos humanos",
          "C5 com nota máxima, pois é completa",
          "C2 zerada",
          "C3 reduzida pela metade",
        ],
        answerIndex: 0,
        explanation: "Mesmo completa, a proposta que viola direitos humanos zera a C5 — regra específica da matriz.",
      },
      {
        id: "q4",
        prompt:
          "O candidato escreve com excelente domínio gramatical, mas tangencia o tema, falando de um assunto vizinho. Qual competência sofre mais?",
        options: [
          "C2 — abordagem completa do tema",
          "C1 — norma culta",
          "C4 — coesão",
          "C3 — argumentação",
        ],
        answerIndex: 0,
        explanation: "Domínio gramatical preserva a C1; o tangenciamento ao recorte é falha de C2 (e, em fuga total, zera a redação).",
      },
      {
        id: "q5",
        prompt:
          "Os parágrafos são bem articulados entre si, mas dentro de cada um as frases se justapõem sem conectivos. Qual competência é mais afetada?",
        options: [
          "C4 — coesão intraparágrafo (microestrutura)",
          "C3 — argumentação",
          "C1 — norma culta",
          "C2 — tema",
        ],
        answerIndex: 0,
        explanation: "A coesão (C4) abrange tanto a articulação entre parágrafos quanto entre frases; a falha aqui é intraparágrafo.",
      },
      {
        id: "q6",
        prompt:
          "A redação tem ótimos argumentos, mas usa 'a gente', 'tá' e gírias. Qual competência é diretamente atingida?",
        options: [
          "C1 — modalidade escrita formal",
          "C3 — argumentação",
          "C2 — repertório",
          "C4 — coesão",
        ],
        answerIndex: 0,
        explanation: "Registro informal e desvios de norma pertencem à C1, mesmo com boa argumentação (C3 preservada).",
      },
      {
        id: "q7",
        prompt:
          "O texto defende um ponto de vista claro, com bons argumentos, mas conclui sem qualquer proposta de solução. O que ocorre?",
        options: [
          "C5 fica baixa por ausência de proposta de intervenção",
          "C3 é zerada",
          "C2 é zerada",
          "Nada muda, pois a argumentação está boa",
        ],
        answerIndex: 0,
        explanation: "A proposta de intervenção é exigência exclusiva da C5; sem ela, essa competência despenca, ainda que a C3 esteja sólida.",
      },
      {
        id: "q8",
        prompt:
          "A proposta existe e respeita os direitos humanos, mas não diz QUEM executará a ação. Qual competência perde pontos e por quê?",
        options: [
          "C5 — falta o elemento 'agente' na proposta",
          "C3 — falta argumento",
          "C2 — falta repertório",
          "C1 — falta norma culta",
        ],
        answerIndex: 0,
        explanation: "A C5 avalia a completude da proposta (agente, ação, meio, finalidade, detalhamento); a ausência de agente a reduz.",
      },
    ],
  },
  {
    id: "competency-classify",
    name: "Sintoma → Competência",
    category: "competencias-enem",
    description: "Arraste cada sintoma de correção para a competência que ele MAIS afeta. Vários são casos-limite que tangenciam duas competências.",
    difficulty: "Avancado",
    estimatedTime: "5 min",
    thumbnail: "competencias-classify",
    progress: 0,
    unlocked: true,
    engine: "classify",
    skill: "Mapeamento de competências",
    classify: {
      instruction: "Para cada sintoma, escolha a competência principalmente atingida — pense no que a matriz avalia em cada caso.",
      buckets: [
        { id: "c1", label: "C1 — Norma culta", hint: "modalidade escrita formal" },
        { id: "c2", label: "C2 — Tema e repertório", hint: "recorte e pertinência" },
        { id: "c3", label: "C3 — Argumentação", hint: "projeto de texto, progressão" },
        { id: "c4", label: "C4 — Coesão", hint: "articulação entre partes" },
        { id: "c5", label: "C5 — Intervenção", hint: "proposta detalhada" },
      ],
      items: [
        { id: "i1", text: "Repertório legítimo, porém desconectado do recorte do tema", bucketId: "c2", explanation: "Pertinência do repertório é C2, não C3." },
        { id: "i2", text: "Ideias que não progridem: o 2º parágrafo repete o 1º", bucketId: "c3", explanation: "Falta de progressão é projeto de texto — C3." },
        { id: "i3", text: "Uso recorrente de 'pra' e 'você' no texto", bucketId: "c1" },
        { id: "i4", text: "Frases justapostas sem conectivos dentro do parágrafo", bucketId: "c4" },
        { id: "i5", text: "Proposta sem o elemento 'meio' (o como)", bucketId: "c5" },
        { id: "i6", text: "Abordagem que fala do tema vizinho, tangenciando o recorte", bucketId: "c2" },
        { id: "i7", text: "Repetição da palavra 'sociedade' por falta de retomada", bucketId: "c4", explanation: "Substituição lexical é coesão — C4." },
        { id: "i8", text: "Ponto de vista frágil, sem argumentos que o sustentem", bucketId: "c3" },
        { id: "i9", text: "Erros de crase e concordância ao longo do texto", bucketId: "c1" },
        { id: "i10", text: "Proposta detalhada, mas que sugere punição violenta ilegal", bucketId: "c5", explanation: "Viola direitos humanos: zera a C5." },
      ],
    },
  },
];
