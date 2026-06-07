import type { GameDefinition } from "@/features/gamification/types";

export const artificialityGames: GameDefinition[] = [
  {
    id: "artificiality-detector",
    name: "Detector de Artificialidade",
    category: "coesao",
    description: "Treine o ouvido para o texto que perde autenticidade: rebuscamento vazio, abstração genérica e 'cara de IA'. Diga se o trecho é autêntico ou artificial — e por quê.",
    difficulty: "Avancado",
    xpReward: 78,
    estimatedTime: "7 min",
    thumbnail: "detector-artificial",
    progress: 0,
    unlocked: true,
    engine: "artificiality",
    skill: "Naturalidade textual",
    tags: ["texto-robotico", "abstracao-excessiva"],
    hubs: ["texto-robotico"],
    cognitiveFocus: ["diagnosis"],
    artificiality: {
      rounds: [
        {
          id: "a1",
          passage:
            "Outrossim, é de suma importância salientar que a problemática em tela, hodiernamente, demanda providências urgentes por parte dos atores sociais envolvidos no processo.",
          verdict: "artificial",
          flaw: {
            options: [
              { id: "o1", label: "Rebuscamento vazio (jargão pomposo sem conteúdo)", correct: true, note: "Acumula 'outrossim', 'em tela', 'hodiernamente' sem dizer nada concreto." },
              { id: "o2", label: "Erro de concordância", correct: false, note: "Não há desvio gramatical." },
              { id: "o3", label: "Falta de coesão referencial", correct: false, note: "A coesão até existe; o problema é o vazio." },
            ],
          },
          explanation: "Sofisticação não é palavra difícil: o trecho é só pompa. Frase artificial por rebuscamento oco.",
          tags: ["texto-robotico"],
        },
        {
          id: "a2",
          passage:
            "A exclusão digital aprofunda velhas desigualdades: quem não tem internet em casa estuda menos, encontra menos trabalho e participa menos das decisões que o afetam.",
          verdict: "humano",
          explanation: "Frase clara, concreta e progressiva, com paralelismo natural ('estuda menos, encontra menos, participa menos'). Autêntica.",
          tags: ["progressao-fraca"],
        },
        {
          id: "a3",
          passage:
            "Em um mundo cada vez mais globalizado e conectado, é inegável que a tecnologia desempenha um papel fundamental e transformador na sociedade contemporânea atual.",
          verdict: "artificial",
          flaw: {
            options: [
              { id: "o1", label: "Abertura genérica de molde ('cara de IA')", correct: true, note: "'Em um mundo cada vez mais globalizado' é fórmula vazia, aplicável a qualquer tema." },
              { id: "o2", label: "Ambiguidade referencial", correct: false, note: "Não há ambiguidade; há vacuidade." },
              { id: "o3", label: "Falácia de falsa causa", correct: false, note: "Não há argumento causal aqui." },
            ],
          },
          explanation: "Clichê de abertura que não diz nada e ainda é redundante ('contemporânea atual'). Artificial.",
          tags: ["texto-robotico", "abstracao-excessiva"],
        },
        {
          id: "a4",
          passage:
            "Bauman chamaria isso de modernidade líquida: o vínculo que se desfaz a um toque revela menos frieza individual e mais um modo de vida que aprendeu a tratar pessoas como atualizações de software.",
          verdict: "humano",
          explanation: "Repertório operado com imagem própria e precisa ('atualizações de software'). Autoria real, não molde.",
          tags: ["repertorio-decorativo"],
        },
        {
          id: "a5",
          passage:
            "A educação é a base de tudo. Sem educação, não há futuro. Por isso, investir em educação é investir no amanhã de uma nação que deseja crescer.",
          verdict: "artificial",
          flaw: {
            options: [
              { id: "o1", label: "Circularidade e clichê (frases de efeito vazias)", correct: true, note: "'Base de tudo', 'investir no amanhã' — slogans que se repetem sem avançar." },
              { id: "o2", label: "Desvio de regência", correct: false, note: "Gramaticalmente correto." },
              { id: "o3", label: "Falta de repertório", correct: false, note: "O defeito é a circularidade, não só a ausência de repertório." },
            ],
          },
          explanation: "Encadeia chavões que giram em torno de si mesmos. Soa motivacional, não argumentativo.",
          tags: ["argumentacao-rasa", "texto-robotico"],
        },
        {
          id: "a6",
          passage:
            "Não se trata de demonizar a tecnologia, mas de perguntar quem decide o que vemos — e a quem interessa que vejamos justamente isso.",
          verdict: "humano",
          explanation: "Movimento retórico autoral (retificação + pergunta que reposiciona o debate). Voz humana, não molde.",
          tags: ["argumentacao-rasa"],
        },
        {
          id: "a7",
          passage:
            "Destarte, conclui-se que a sociedade como um todo deve, de maneira conjunta e colaborativa, unir forças para combater esse mal que assola a todos indistintamente.",
          verdict: "artificial",
          flaw: {
            options: [
              { id: "o1", label: "Conclusão-fórmula sem agente nem proposta", correct: true, note: "'Sociedade como um todo unir forças' é o clichê que dispensa agente e meio." },
              { id: "o2", label: "Erro de pontuação", correct: false, note: "A pontuação está correta." },
              { id: "o3", label: "Ambiguidade", correct: false, note: "Não há ambiguidade, há vacuidade prescritiva." },
            ],
          },
          explanation: "Fechamento genérico que não nomeia quem age nem como. Intervenção fantasma.",
          tags: ["conclusao-formula", "intervencao-incompleta"],
        },
        {
          id: "a8",
          passage:
            "Os dados do IBGE não são um detalhe técnico: cada ponto percentual sem internet é um adolescente que assistiu à aula pelo vão da janela do vizinho.",
          verdict: "humano",
          explanation: "Interpreta o dado com imagem concreta e original. Densidade autoral — o oposto do genérico.",
          tags: ["repertorio-decorativo"],
        },
      ],
    },
  },
];
