import type { GameDefinition } from "@/features/gamification/types";

export const connectiveGames: GameDefinition[] = [
  {
    id: "connectives-precision",
    name: "Acerte o Conectivo",
    category: "coesao",
    description:
      "Modo cronometrado: todas as opções são conectivos gramaticais — só uma preserva a relação lógica do período. Distinga concessão, adversidade, causa, conclusão e proporção sob pressão.",
    difficulty: "Avancado",
    estimatedTime: "Infinito",
    thumbnail: "coesao-conectivos",
    progress: 0,
    unlocked: true,
    engine: "timed-rush",
    skill: "Semântica dos conectivos",
    questions: [
      {
        id: "q1",
        prompt:
          "'O relatório aponta avanços na conectividade rural; ___, omite que metade das escolas segue sem banda larga.' Qual conectivo mantém a relação concessiva-adversativa pretendida?",
        options: ["contudo", "porquanto", "à medida que", "consoante"],
        answerIndex: 0,
        explanation: "Após admitir um avanço, contrapõe-se uma ressalva: valor adversativo. 'Porquanto' é causal; 'à medida que', proporcional; 'consoante', conformativo.",
      },
      {
        id: "q2",
        prompt:
          "'A política de cotas não eliminou a desigualdade; ___, reduziu de forma mensurável a evasão entre grupos sub-representados.' Qual opção marca a contraposição sem negar o mérito?",
        options: ["não obstante", "porquanto", "à proporção que", "tampouco"],
        answerIndex: 0,
        explanation: "'Não obstante' = 'apesar disso', concessivo-adversativo. 'Tampouco' soma negações (não cabe após ponto e vírgula afirmativo); 'porquanto' é causal.",
      },
      {
        id: "q3",
        prompt:
          "'___ os algoritmos otimizem a entrega de conteúdo, eles tendem a confinar o usuário a uma bolha informacional.' Qual conectivo abre a oração concessiva?",
        options: ["Conquanto", "Porquanto", "Porventura", "Consoante"],
        answerIndex: 0,
        explanation: "'Conquanto' = 'embora' (concessiva). 'Porquanto' é causal; 'porventura' é dúvida; 'consoante', conformidade.",
      },
      {
        id: "q4",
        prompt:
          "'A renda das famílias melhora ___ avançam as políticas de transferência condicionada.' Qual conectivo expressa a proporcionalidade entre as duas variáveis?",
        options: ["à medida que", "uma vez que", "ainda que", "desde que"],
        answerIndex: 0,
        explanation: "Duas grandezas que variam juntas pedem locução proporcional ('à medida que'). 'Uma vez que' é causal; 'desde que', condicional.",
      },
      {
        id: "q5",
        prompt:
          "'O Estado ampliou o acervo das bibliotecas ___ democratizar o acesso à leitura.' Distinga finalidade de causa: qual cabe?",
        options: ["a fim de", "visto que", "porquanto", "haja vista"],
        answerIndex: 0,
        explanation: "A oração exprime objetivo (finalidade): 'a fim de'. As demais ('visto que', 'porquanto', 'haja vista') são todas causais/explicativas.",
      },
      {
        id: "q6",
        prompt:
          "'A medida era impopular; ___, foi adotada porque os indicadores não deixavam alternativa.' Qual conectivo conclui o raciocínio mantendo a coerência?",
        options: ["ainda assim", "por isso", "porquanto", "à medida que"],
        answerIndex: 0,
        explanation: "Adota-se algo impopular contrariando a expectativa: concessivo ('ainda assim'). 'Por isso' inverteria a lógica (impopularidade não causa a adoção).",
      },
      {
        id: "q7",
        prompt:
          "'Investiu-se pesado em formação docente; ___, os índices de proficiência mal se moveram.' Qual opção sinaliza frustração de expectativa?",
        options: ["entretanto", "destarte", "porquanto", "consoante"],
        answerIndex: 0,
        explanation: "Resultado contraria o esperado: adversativo ('entretanto'). 'Destarte' é conclusivo ('assim'); 'consoante', conformativo.",
      },
      {
        id: "q8",
        prompt:
          "'O programa fracassou em escala nacional; ___, seria precipitado abandoná-lo antes de avaliar os pilotos regionais.' Qual conectivo cabe?",
        options: ["todavia", "portanto", "porquanto", "logo"],
        answerIndex: 0,
        explanation: "Apesar do fracasso, conclui-se o oposto do esperado: concessivo-adversativo ('todavia'). 'Portanto'/'logo' dariam conclusão alinhada, não contrária.",
      },
      {
        id: "q9",
        prompt:
          "'Não se trata de censurar as plataformas, ___ de exigir transparência sobre os critérios de moderação.' Qual conectivo corrige e retifica?",
        options: ["mas sim", "porquanto", "à medida que", "conquanto"],
        answerIndex: 0,
        explanation: "Estrutura correlativa 'não... mas sim' (retificação). Os demais introduziriam causa, proporção ou concessão.",
      },
      {
        id: "q10",
        prompt:
          "'A desinformação se propaga em segundos; ___, a checagem de fatos exige dias de apuração.' Qual conectivo opõe os dois ritmos?",
        options: ["ao passo que", "visto que", "de modo que", "tão logo"],
        answerIndex: 0,
        explanation: "'Ao passo que' marca contraste/simultaneidade entre situações opostas. 'De modo que' é consecutivo; 'tão logo', temporal; 'visto que', causal.",
      },
      {
        id: "q11",
        prompt:
          "'A reforma encareceu o serviço ___, na prática, expulsou os usuários de baixa renda.' Qual conectivo expressa a consequência (resultado lógico)?",
        options: ["de sorte que", "conquanto", "porquanto", "à medida que"],
        answerIndex: 0,
        explanation: "'De sorte que' = 'de modo que' (consecutivo, indica resultado). 'Porquanto' marcaria causa, invertendo a relação.",
      },
      {
        id: "q12",
        prompt:
          "'___ se invista em tecnologia, sem formação crítica o uso permanece raso.' Qual conectivo introduz a concessão hipotética?",
        options: ["Por mais que", "Desde que", "Visto que", "Sempre que"],
        answerIndex: 0,
        explanation: "'Por mais que' = concessiva intensiva. 'Desde que'/'sempre que' são condicional/temporal; 'visto que', causal.",
      },
      {
        id: "q13",
        prompt:
          "'A leitura literária forma repertório; ___, refina a percepção ética do leitor.' Qual conectivo adiciona um argumento de mesmo peso, em registro formal?",
        options: ["outrossim", "porquanto", "conquanto", "à medida que"],
        answerIndex: 0,
        explanation: "'Outrossim' = 'além disso' (adição formal). 'Porquanto' (causa), 'conquanto' (concessão) e 'à medida que' (proporção) mudariam a relação.",
      },
      {
        id: "q14",
        prompt:
          "'A vacina foi distribuída tardiamente; ___, milhares de mortes evitáveis se acumularam.' Qual conectivo encadeia a consequência?",
        options: ["por conseguinte", "não obstante", "porquanto", "conquanto"],
        answerIndex: 0,
        explanation: "Relação causal-conclusiva (efeito): 'por conseguinte'. 'Não obstante'/'conquanto' seriam concessivos; 'porquanto', causal anteposto.",
      },
      {
        id: "q15",
        prompt:
          "'O texto cita Foucault ___ legitimar a tese sobre vigilância digital.' Qual conectivo exprime finalidade sem ambiguidade com causa?",
        options: ["a fim de", "já que", "uma vez que", "visto que"],
        answerIndex: 0,
        explanation: "Citar 'para' legitimar = finalidade ('a fim de'). As demais são causais e diriam que a tese já estava legitimada antes.",
      },
      {
        id: "q16",
        prompt:
          "'Reconheço a complexidade do problema; ___, defendo que a inação é a pior das escolhas.' Qual conectivo articula a ressalva conclusiva?",
        options: ["ainda assim", "porquanto", "à medida que", "tão logo"],
        answerIndex: 0,
        explanation: "Admite-se a complexidade e mantém-se a posição contrária à expectativa: 'ainda assim' (concessivo).",
      },
      {
        id: "q17",
        prompt:
          "'A curva de contágio cedeu ___ a adesão às medidas sanitárias aumentou.' Qual conectivo liga as duas variáveis em proporção inversa de tempo?",
        options: ["à medida que", "ainda que", "a fim de que", "posto que"],
        answerIndex: 0,
        explanation: "'À medida que' relaciona a evolução simultânea das grandezas. 'Posto que' é concessivo na norma culta; 'a fim de que', final.",
      },
      {
        id: "q18",
        prompt:
          "'O argumento é elegante; ___, repousa sobre um dado já desmentido por três estudos.' Qual conectivo introduz a objeção decisiva?",
        options: ["sucede que", "de modo que", "a fim de que", "tão logo"],
        answerIndex: 0,
        explanation: "'Sucede que' (= 'acontece que') introduz uma objeção/contraponto factual. 'De modo que' seria consecutivo, não adversativo.",
      },
      {
        id: "q19",
        prompt:
          "'A obra dialoga com Bauman ___ descreve vínculos afetivos mediados por aplicativos.' Distinga conformidade de causa: qual cabe?",
        options: ["na medida em que", "à medida que", "a fim de que", "conquanto"],
        answerIndex: 0,
        explanation: "'Na medida em que' = 'porque/já que' (causal-explicativa). 'À medida que' seria proporção temporal — erro frequente de troca.",
      },
      {
        id: "q20",
        prompt:
          "'Os dados não comprovam a hipótese; ___, não a refutam de modo conclusivo.' Qual conectivo equilibra a dupla ressalva?",
        options: ["tampouco", "portanto", "porquanto", "destarte"],
        answerIndex: 0,
        explanation: "'Tampouco' = 'também não', somando duas negações coordenadas. 'Portanto'/'destarte' dariam conclusão, descabida aqui.",
      },
    ],
  },
  {
    id: "referential-cohesion",
    name: "Retomada e Referência",
    category: "coesao",
    description: "Anáfora, catáfora, elipse e ambiguidade referencial. Identifique o que cada expressão retoma — ou projeta — e diagnostique falhas de referenciação.",
    difficulty: "Avancado",
    estimatedTime: "6 min",
    thumbnail: "coesao-retomadas",
    progress: 0,
    unlocked: true,
    engine: "quiz",
    skill: "Referenciação",
    questions: [
      {
        id: "q1",
        prompt:
          "'Resta apenas isto ao gestor: admitir o erro e reparar o dano.' O pronome 'isto' exerce que tipo de referência?",
        options: [
          "catáfora — projeta o que vem depois",
          "anáfora — retoma o que veio antes",
          "elipse do sujeito",
          "anáfora associativa",
        ],
        answerIndex: 0,
        explanation: "'Isto' aponta para frente, antecipando 'admitir o erro e reparar o dano' — referência catafórica.",
      },
      {
        id: "q2",
        prompt:
          "'O delegado interrogou o suspeito, mas ele se contradisse.' Por que a referência de 'ele' é defeituosa?",
        options: [
          "há dois antecedentes possíveis, gerando ambiguidade referencial",
          "'ele' é catáfora sem termo subsequente",
          "exige elipse, não pronome",
          "'ele' faz anáfora associativa indevida",
        ],
        answerIndex: 0,
        explanation: "Com 'delegado' e 'suspeito' como antecedentes masculinos, 'ele' não resolve o referente — ambiguidade.",
      },
      {
        id: "q3",
        prompt:
          "'Comprou um carro novo; o motor, porém, já apresentava falhas.' A expressão 'o motor' é exemplo de:",
        options: [
          "anáfora associativa (parte evocada pelo todo já mencionado)",
          "catáfora",
          "repetição lexical",
          "elipse",
        ],
        answerIndex: 0,
        explanation: "'O motor' não foi citado antes, mas é inferível a partir de 'carro' — anáfora associativa (meronímia).",
      },
      {
        id: "q4",
        prompt:
          "'Os pesquisadores publicaram o estudo e [ ] receberam o prêmio.' O apagamento do sujeito na 2ª oração caracteriza:",
        options: ["elipse (zeugma do sujeito)", "anáfora pronominal", "catáfora", "ambiguidade"],
        answerIndex: 0,
        explanation: "O sujeito 'os pesquisadores' é retomado por apagamento (elipse), recurso coesivo de economia.",
      },
      {
        id: "q5",
        prompt:
          "'A empresa demitiu funcionários e fechou filiais. Tais medidas geraram revolta.' 'Tais medidas' retoma o referente por:",
        options: [
          "rotulação (encapsulamento de orações anteriores em um sintagma)",
          "sinônimo perfeito",
          "catáfora",
          "elipse",
        ],
        answerIndex: 0,
        explanation: "O sintagma nominal 'tais medidas' encapsula e nomeia as ações descritas — coesão por rótulo (anáfora encapsuladora).",
      },
      {
        id: "q6",
        prompt:
          "Qual reescrita elimina a ambiguidade de 'O pai disse ao filho que seu carro fora multado'?",
        options: [
          "O pai disse ao filho que o carro deste fora multado.",
          "O pai disse ao filho que seu próprio carro dele fora multado.",
          "O pai disse que o carro foi multado ao filho.",
          "O pai, ao filho, disse que seu carro fora multado.",
        ],
        answerIndex: 0,
        explanation: "'Deste' (=do filho) desfaz a ambiguidade do possessivo 'seu'. As demais não definem o possuidor com clareza.",
      },
      {
        id: "q7",
        prompt:
          "'A LGPD entrou em vigor em 2020. O diploma legal regula o tratamento de dados.' 'O diploma legal' retoma 'a LGPD' por:",
        options: [
          "hiperônimo/expressão definida (substituição lexical)",
          "anáfora associativa",
          "catáfora",
          "elipse",
        ],
        answerIndex: 0,
        explanation: "Substitui-se a sigla por uma expressão mais geral e definida, evitando repetição — coesão lexical por hiperonímia.",
      },
      {
        id: "q8",
        prompt:
          "'Quando ela chegou, a diretora já havia saído.' Sobre a ordem catáfora/anáfora, é correto afirmar:",
        options: [
          "'ela' pode ser lido como catáfora de 'a diretora' ou referir-se a outra pessoa — a posição antecipada gera leitura ambígua",
          "'ela' é necessariamente anáfora de 'a diretora'",
          "não há relação referencial entre 'ela' e 'a diretora'",
          "'a diretora' é catáfora de 'ela'",
        ],
        answerIndex: 0,
        explanation: "Pronome anteposto ao seu possível antecedente admite leitura catafórica (=a diretora) ou disjunta (outra mulher): ambiguidade estrutural.",
      },
    ],
  },
  {
    id: "connective-function-match",
    name: "Conectivo Polissêmico",
    category: "coesao",
    description: "Vários conectivos mudam de função conforme o contexto. Leia o uso indicado e arraste cada um para a relação lógica que ele estabelece naquele emprego.",
    difficulty: "Avancado",
    estimatedTime: "6 min",
    thumbnail: "coesao-funcao",
    progress: 0,
    unlocked: true,
    engine: "classify",
    skill: "Valor semântico em contexto",
    classify: {
      instruction:
        "Cada cartão traz um conectivo COM o contexto de uso entre aspas. Classifique pela função que ele exerce NAQUELE emprego — alguns mudam de valor conforme o contexto.",
      buckets: [
        { id: "concessao", label: "Concessão", hint: "contraria a expectativa: 'embora'" },
        { id: "causa", label: "Causa / Explicação", hint: "aponta o porquê" },
        { id: "consecucao", label: "Consequência", hint: "indica o resultado: 'de modo que'" },
        { id: "finalidade", label: "Finalidade", hint: "indica o objetivo: 'para que'" },
        { id: "proporcao", label: "Proporção / Conformidade", hint: "'à medida que' / 'conforme'" },
      ],
      items: [
        { id: "i1", text: "'na medida em que' — 'É justo, na medida em que trata desiguais de modo desigual.'", bucketId: "causa", explanation: "'Na medida em que' = porque/já que (causal)." },
        { id: "i2", text: "'à medida que' — 'A tensão crescia à medida que o prazo se aproximava.'", bucketId: "proporcao", explanation: "Variação simultânea de grandezas (proporção)." },
        { id: "i3", text: "'tão... que' — 'O discurso foi tão raso que não convenceu ninguém.'", bucketId: "consecucao", explanation: "Intensidade + resultado = consecutiva." },
        { id: "i4", text: "'que' — 'Estava exausto, que mal conseguia falar.'", bucketId: "consecucao", explanation: "'Que' aqui equivale a 'de modo que' (consecutiva)." },
        { id: "i5", text: "'porquanto' — 'A pena é cabível, porquanto houve dolo.'", bucketId: "causa" },
        { id: "i6", text: "'conquanto' — 'Conquanto rico, vivia como asceta.'", bucketId: "concessao" },
        { id: "i7", text: "'por mais que' — 'Por mais que se esforce, o sistema o limita.'", bucketId: "concessao" },
        { id: "i8", text: "'a fim de que' — 'Reduziu juros a fim de que o consumo reagisse.'", bucketId: "finalidade" },
        { id: "i9", text: "'de sorte que' — 'Calou-se, de sorte que ninguém soube a verdade.'", bucketId: "consecucao", explanation: "'De sorte que' = de modo que (resultado)." },
        { id: "i10", text: "'consoante' — 'Agiu consoante determina a lei.'", bucketId: "proporcao", explanation: "'Consoante' = conforme (conformidade)." },
        { id: "i11", text: "'visto que' — 'Adiou-se a prova, visto que faltou energia.'", bucketId: "causa" },
        { id: "i12", text: "'para que' — 'Falou devagar para que todos entendessem.'", bucketId: "finalidade" },
      ],
    },
  },
];
