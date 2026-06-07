import type { GameDefinition } from "@/features/gamification/types";

export const surgeryGames: GameDefinition[] = [
  {
    id: "text-surgery",
    name: "Cirurgia Textual",
    category: "estrutura",
    description: "Um texto forte foi degradado. Restaure cada trecho escolhendo a melhor versão — e, em um deles, reescrevendo à mão (avaliado por IA). Receba nota por qualidade, não por 'certo/errado'.",
    difficulty: "Avancado",
    xpReward: 96,
    estimatedTime: "9 min",
    thumbnail: "cirurgia-textual",
    progress: 0,
    unlocked: true,
    engine: "text-surgery",
    skill: "Refinamento de escrita",
    tags: ["texto-robotico", "repeticao-lexical", "conectivo-artificial"],
    hubs: ["texto-robotico", "repete-ideias", "repertorio-nao-encaixa"],
    cognitiveFocus: ["refinement", "prioritization", "reconstruction"],
    textSurgery: {
      cases: [
        {
          id: "case1",
          brief: "Parágrafo sobre desinformação. Restaure os trechos destacados para máxima qualidade.",
          segments: [
            "A desinformação ameaça a democracia. ",
            {
              slotId: "s1",
              mode: "choice",
              tags: ["conectivo-artificial"],
              options: [
                { text: "Isso porque, ao premiar o engajamento, os algoritmos favorecem o boato sobre o fato;", grade: "S", note: "Conecta com causa precisa e mantém fluidez." },
                { text: "Além disso, a internet é cheia de mentiras que enganam todo mundo;", grade: "C", note: "Genérico e impreciso ('cheia de mentiras')." },
                { text: "Outrossim, hodiernamente, a problemática informacional se agudiza;", grade: "Fraco", note: "Rebuscamento vazio, sem conteúdo." },
                { text: "E também tem muita fake news circulando por aí;", grade: "Fraco", note: "Registro coloquial, impróprio para dissertação." },
              ],
            },
            " ",
            {
              slotId: "s2",
              mode: "choice",
              tags: ["repeticao-lexical"],
              options: [
                { text: "assim, a mentira se disfarça de notícia e se espalha mais rápido que a correção.", grade: "S", note: "Imagem precisa e progressão; evita repetir 'desinformação'." },
                { text: "assim, a desinformação desinforma as pessoas que são desinformadas.", grade: "Fraco", note: "Repetição/circularidade gritante." },
                { text: "assim, isso acontece e é muito ruim para a sociedade em geral.", grade: "C", note: "Vago, sem avançar a ideia." },
                { text: "portanto, conclui-se que a internet deveria ser proibida para todos.", grade: "Fraco", note: "Salto lógico e proposta autoritária." },
              ],
            },
          ],
        },
        {
          id: "case2",
          brief: "Conclusão degradada. Escolha a abertura e depois reescreva o fechamento à mão.",
          segments: [
            {
              slotId: "s3",
              mode: "choice",
              tags: ["conclusao-formula"],
              options: [
                { text: "Diante do exposto, urge enfrentar a exclusão digital como questão de cidadania:", grade: "S", note: "Retomada firme e delimitada." },
                { text: "Portanto, fica claro que esse é um problema muito sério para todos nós:", grade: "C", note: "Clichê de fechamento, sem precisão." },
                { text: "Em suma, a sociedade como um todo deve refletir sobre isso:", grade: "Fraco", note: "Genérico e sem agente." },
                { text: "Concluindo o meu texto, eu acho que precisamos mudar:", grade: "Fraco", note: "Metalinguagem e 1ª pessoa informal." },
              ],
            },
            " cabe ao poder público agir. ",
            {
              slotId: "s4",
              mode: "rewrite",
              base: "o governo tem que ajudar as escolas a terem internet para os alunos não ficarem para trás.",
              criteria: "proposta de intervenção completa: agente específico, ação, meio e finalidade, em registro formal",
              tags: ["intervencao-incompleta", "c5"],
            },
          ],
        },
      ],
    },
  },
];
