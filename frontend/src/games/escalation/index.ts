import type { GameDefinition } from "@/features/gamification/types";

export const escalationGames: GameDefinition[] = [
  {
    id: "argument-escalation",
    name: "Escalada Argumentativa",
    category: "argumentacao",
    description: "Pegue uma opinião rasa e suba degrau a degrau até a complexidade. A cada nível, escolha a formulação que aprofunda de verdade — as dicas somem no topo.",
    difficulty: "Avancado",
    estimatedTime: "8 min",
    thumbnail: "escalada-argumento",
    progress: 0,
    unlocked: true,
    engine: "argument-escalation",
    skill: "Profundidade argumentativa",
    tags: ["argumentacao-rasa", "tese-vaga"],
    hubs: ["nao-aprofunda", "introducao-sem-tese"],
    cognitiveFocus: ["progression", "diagnosis"],
    escalation: {
      ladders: [
        {
          id: "l1",
          theme: "Tema: leitura crítica entre jovens",
          tags: ["argumentacao-rasa", "tese-vaga"],
          rungs: [
            {
              level: 1,
              instruction: "Nível 1 — Saia do achismo: transforme a opinião num juízo claro.",
              options: [
                { text: "Os jovens leem pouco hoje em dia.", correct: true, note: "Afirmação clara, ainda simples — base para subir." },
                { text: "Acho que ler é uma coisa boa para todos.", correct: false, note: "Opinião vaga e pessoal ('acho que')." },
                { text: "A leitura é um tema muito interessante.", correct: false, note: "Comentário sobre o tema, não sobre o problema." },
              ],
            },
            {
              level: 2,
              instruction: "Nível 2 — Adicione uma justificativa (o porquê).",
              options: [
                { text: "Os jovens leem pouco porque o ambiente digital privilegia estímulos rápidos.", correct: true, note: "Acrescenta causa plausível." },
                { text: "Os jovens leem pouco e isso é muito ruim para eles.", correct: false, note: "Repete a tese e só agrega juízo de valor." },
                { text: "Os jovens leem pouco, mas alguns leem bastante.", correct: false, note: "Ressalva que dispersa, não aprofunda." },
              ],
            },
            {
              level: 3,
              instruction: "Nível 3 — Estabeleça uma relação causal mais precisa.",
              options: [
                { text: "A escassez de mediação escolar faz com que o hábito de leitura não se consolide entre os jovens.", correct: true, note: "Causa estrutural (mediação) ligada ao efeito." },
                { text: "Como os jovens usam muito o celular, eles não gostam de ler.", correct: false, note: "Causalidade frouxa e generalizante." },
                { text: "Os jovens leem pouco e usam muito a internet.", correct: false, note: "Justaposição sem relação causal." },
              ],
            },
            {
              level: 4,
              instruction: "Nível 4 — Mostre a consequência social do problema.",
              options: [
                { text: "Sem leitura crítica, os jovens tornam-se mais vulneráveis à desinformação, o que fragiliza o debate público.", correct: true, note: "Conecta o problema a um efeito coletivo." },
                { text: "Sem ler, os jovens tiram notas baixas na escola.", correct: false, note: "Consequência individual e restrita." },
                { text: "A falta de leitura deixa os jovens menos cultos.", correct: false, note: "Juízo vago ('menos cultos'), sem alcance social." },
              ],
            },
            {
              level: 5,
              instruction: "Nível 5 — Revele a dimensão estrutural (sem dica).",
              options: [
                { text: "A baixa leitura crítica reproduz desigualdades: quem não dispõe de mediação cultural permanece à margem dos circuitos de poder simbólico.", correct: true, note: "Articula o problema com estrutura social." },
                { text: "A leitura deveria ser incentivada por todos na sociedade.", correct: false, note: "Apelo genérico, recua ao nível 1." },
                { text: "Os jovens precisam ler mais para serem bem-sucedidos.", correct: false, note: "Reduz a questão ao sucesso individual." },
              ],
            },
            {
              level: 6,
              instruction: "Nível 6 — Integre repertório de forma produtiva (sem dica).",
              options: [
                { text: "Como sugere Bourdieu, o capital cultural herdado define o acesso à leitura crítica; assim, sem mediação pública, a escola apenas confirma a desigualdade de origem.", correct: true, note: "Repertório operado sobre o problema, fechando o raciocínio." },
                { text: "Bourdieu foi um sociólogo francês que estudou a cultura e a educação.", correct: false, note: "Repertório decorativo (biografia)." },
                { text: "Vários autores famosos já falaram sobre a importância da leitura.", correct: false, note: "Vago, sem repertório real." },
              ],
            },
          ],
        },
        {
          id: "l2",
          theme: "Tema: mobilidade urbana",
          tags: ["c3", "progressao-fraca"],
          rungs: [
            {
              level: 1,
              instruction: "Nível 1 — Saia do desabafo: faça uma afirmação clara.",
              options: [
                { text: "O transporte público nas grandes cidades é insuficiente.", correct: true, note: "Afirmação verificável." },
                { text: "O trânsito é um caos e ninguém aguenta mais.", correct: false, note: "Desabafo, não afirmação argumentável." },
                { text: "Mobilidade urbana é um assunto importante.", correct: false, note: "Comentário sobre o tema." },
              ],
            },
            {
              level: 2,
              instruction: "Nível 2 — Acrescente a causa.",
              options: [
                { text: "O transporte público é insuficiente porque o planejamento priorizou historicamente o automóvel particular.", correct: true, note: "Causa estrutural." },
                { text: "O transporte é ruim porque tem muita gente nas cidades.", correct: false, note: "Causa simplista (apenas densidade)." },
                { text: "O transporte público é ruim e caro.", correct: false, note: "Soma de queixas sem causa." },
              ],
            },
            {
              level: 3,
              instruction: "Nível 3 — Precise o nexo causal.",
              options: [
                { text: "A prioridade ao carro consome o espaço e o orçamento que poderiam expandir o transporte coletivo, perpetuando a precariedade.", correct: true, note: "Mecanismo causal detalhado." },
                { text: "Como há muitos carros, o ônibus fica preso no trânsito.", correct: false, note: "Recorte estreito do problema." },
                { text: "O transporte é ruim por falta de investimento.", correct: false, note: "Causa genérica." },
              ],
            },
            {
              level: 4,
              instruction: "Nível 4 — Mostre a consequência social.",
              options: [
                { text: "Essa precariedade penaliza sobretudo a periferia, que gasta horas em deslocamento e perde acesso a trabalho, estudo e lazer.", correct: true, note: "Efeito social com recorte de classe." },
                { text: "Isso faz as pessoas se atrasarem para o trabalho.", correct: false, note: "Consequência individual e pontual." },
                { text: "O trânsito ruim deixa todo mundo estressado.", correct: false, note: "Generalização vaga." },
              ],
            },
            {
              level: 5,
              instruction: "Nível 5 — Dimensão estrutural (sem dica).",
              options: [
                { text: "A mobilidade desigual materializa, no espaço, a divisão de classes: o direito à cidade é distribuído conforme a renda.", correct: true, note: "Articula espaço e desigualdade." },
                { text: "Todos deveriam poder andar de transporte bom na cidade.", correct: false, note: "Apelo genérico." },
                { text: "É preciso melhorar o transporte urgentemente.", correct: false, note: "Prescrição precoce, sem análise." },
              ],
            },
            {
              level: 6,
              instruction: "Nível 6 — Integre repertório (sem dica).",
              options: [
                { text: "Como afirma Lefebvre, o direito à cidade pressupõe acesso equitativo ao espaço; logo, ampliar o transporte coletivo é menos uma questão de tráfego e mais de justiça social.", correct: true, note: "Repertório operado, reposicionando o problema." },
                { text: "Henri Lefebvre foi um filósofo que escreveu sobre as cidades.", correct: false, note: "Repertório decorativo." },
                { text: "Especialistas dizem que o transporte precisa melhorar.", correct: false, note: "Apelo vago à autoridade." },
              ],
            },
          ],
        },
      ],
    },
  },
];
