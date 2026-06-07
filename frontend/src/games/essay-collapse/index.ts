import type { GameDefinition } from "@/features/gamification/types";

export const collapseGames: GameDefinition[] = [
  {
    id: "essay-collapse",
    name: "Resgate da Redação",
    category: "estrutura",
    description: "Uma redação forte entrou em colapso: parágrafos embaralhados e conectivos arrancados. Reordene e reconecte para restaurar a progressão.",
    difficulty: "Avancado",
    xpReward: 84,
    estimatedTime: "8 min",
    thumbnail: "resgate-redacao",
    progress: 0,
    unlocked: true,
    engine: "essay-collapse",
    skill: "Arquitetura textual",
    tags: ["progressao-fraca", "c4"],
    hubs: ["perde-na-c3", "repete-ideias"],
    cognitiveFocus: ["reconstruction", "progression"],
    essayCollapse: {
      rounds: [
        {
          id: "r1",
          brief: "Restaure a introdução: contextualização → problematização → tese → encaminhamento.",
          fragments: [
            { id: "f1", text: "A Constituição de 1988 consagrou a educação como direito de todos e dever do Estado.", correctIndex: 0 },
            { id: "f2", text: "Décadas depois, contudo, o acesso à tecnologia educacional permanece distribuído de forma desigual.", correctIndex: 1 },
            { id: "f3", text: "Esse descompasso entre a norma e a realidade revela a face digital da desigualdade brasileira.", correctIndex: 2 },
            { id: "f4", text: "Convém, portanto, examinar suas causas e delinear caminhos de superação.", correctIndex: 3 },
          ],
          explanation: "A introdução vai do geral (direito constitucional) ao específico (tese sobre exclusão digital) e encaminha a discussão.",
          tags: ["introducao-sem-tese", "progressao-fraca"],
        },
        {
          id: "r2",
          brief: "Restaure o parágrafo de desenvolvimento e escolha o conectivo que mantém a lógica.",
          fragments: [
            { id: "f1", text: "A exclusão digital compromete diretamente o direito à educação.", correctIndex: 0 },
            { id: "f2", text: "Isso ocorre porque o ensino mediado por tecnologia pressupõe conexão estável e dispositivos adequados.", correctIndex: 1 },
            { id: "f3", text: "Dados do IBGE indicam que um quinto dos domicílios não dispõe desses recursos.", correctIndex: 2 },
            { id: "f4", text: "Assim, estudantes de baixa renda acumulam defasagens difíceis de reverter.", correctIndex: 3 },
          ],
          connectors: [
            {
              slotId: "s1",
              before: "não dispõe desses recursos",
              after: "estudantes de baixa renda acumulam defasagens",
              options: [
                { text: "Assim", correct: true, note: "Relação de consequência entre o dado e o efeito." },
                { text: "Entretanto", correct: false, note: "Adversativo quebraria a relação de consequência." },
                { text: "Por exemplo", correct: false, note: "Não se introduz exemplo aqui, e sim resultado." },
              ],
            },
          ],
          explanation: "Tópico → causa → dado → consequência. O conectivo conclusivo ('assim') liga o dado ao efeito.",
          tags: ["progressao-fraca", "conectivo-artificial"],
        },
        {
          id: "r3",
          brief: "Restaure a conclusão com proposta de intervenção completa.",
          fragments: [
            { id: "f1", text: "Diante do exposto, é imperativo enfrentar a exclusão digital como questão de cidadania.", correctIndex: 0 },
            { id: "f2", text: "Para tanto, o Ministério da Educação deve universalizar a conectividade nas escolas públicas.", correctIndex: 1 },
            { id: "f3", text: "Isso se dará por meio de parcerias com estados e investimento em infraestrutura.", correctIndex: 2 },
            { id: "f4", text: "A finalidade é assegurar que nenhum estudante fique à margem do aprendizado mediado por tecnologia.", correctIndex: 3 },
          ],
          connectors: [
            {
              slotId: "s1",
              before: "universalizar a conectividade nas escolas públicas",
              after: "parcerias com estados e investimento em infraestrutura",
              options: [
                { text: "por meio de", correct: true, note: "Introduz o meio da proposta (Competência 5)." },
                { text: "apesar de", correct: false, note: "Concessivo não cabe ao 'meio' da intervenção." },
                { text: "a fim de", correct: false, note: "Indicaria finalidade, mas o trecho descreve o meio." },
              ],
            },
          ],
          explanation: "Retomada da tese → agente + ação → meio → finalidade: estrutura completa da intervenção.",
          tags: ["intervencao-incompleta", "conclusao-formula"],
        },
      ],
    },
  },
];
