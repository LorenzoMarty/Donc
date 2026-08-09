import type { GameDefinition } from "@/features/gamification/types";

export const correctorGames: GameDefinition[] = [
  {
    id: "corrector-diagnosis",
    name: "Diagnóstico de Corretor",
    category: "competencias-enem",
    description: "Assuma a cadeira do corretor: leia o parágrafo e marque só os problemas realmente presentes (há distratores), relacionando cada um à competência afetada.",
    difficulty: "Avancado",
    estimatedTime: "8 min",
    thumbnail: "diagnostico-corretor",
    progress: 0,
    unlocked: true,
    engine: "corrector",
    skill: "Leitura crítica de correção",
    tags: ["c3", "c4"],
    hubs: ["perde-na-c3", "conclusao-formula"],
    cognitiveFocus: ["diagnosis", "prioritization"],
    corrector: {
      cases: [
        {
          id: "c1",
          paragraph:
            "Em um mundo globalizado, a tecnologia é muito importante. As redes sociais influenciam as pessoas e as pessoas são influenciadas pelas redes. Isso mostra que a sociedade precisa mudar.",
          tags: ["repeticao-lexical", "argumentacao-rasa"],
          candidates: [
            { id: "i1", label: "Abertura genérica de molde ('em um mundo globalizado')", competency: "C2", present: true, note: "Clichê que não delimita o tema." },
            { id: "i2", label: "Repetição/circularidade ('influenciam... são influenciadas')", competency: "C3", present: true, note: "A frase gira sobre si mesma, sem progressão." },
            { id: "i3", label: "Conclusão vaga sem ponto de vista ('precisa mudar')", competency: "C3", present: true, note: "Não há tese nem argumento." },
            { id: "i4", label: "Erro de concordância verbal", competency: "C1", present: false, note: "Não há desvio de concordância no trecho." },
            { id: "i5", label: "Uso indevido de crase", competency: "C1", present: false, note: "Não há crase no parágrafo." },
          ],
        },
        {
          id: "c2",
          paragraph:
            "Os jovens precisa de orientação, pois eles vivem conectado o tempo todo. A escola, deve então preparar eles para a vida digital, garantindo que saibam se proteger.",
          tags: ["concordancia", "c1"],
          candidates: [
            { id: "i1", label: "Concordância verbal ('jovens precisa')", competency: "C1", present: true, note: "Sujeito plural exige 'precisam'." },
            { id: "i2", label: "Concordância nominal ('conectado')", competency: "C1", present: true, note: "Deveria concordar: 'conectados'." },
            { id: "i3", label: "Vírgula separando sujeito e verbo ('A escola, deve')", competency: "C1", present: true, note: "Não se separa sujeito do verbo por vírgula." },
            { id: "i4", label: "Pronome reto como objeto ('preparar eles')", competency: "C1", present: true, note: "Norma culta: 'prepará-los'." },
            { id: "i5", label: "Fuga ao tema", competency: "C2", present: false, note: "O parágrafo está dentro do tema." },
            { id: "i6", label: "Ausência de repertório", competency: "C2", present: false, note: "Não se avalia repertório neste recorte; o foco são os desvios." },
          ],
        },
        {
          id: "c3",
          paragraph:
            "A desigualdade é um problema. A fome é um problema. A violência é um problema. Todos esses problemas precisam de solução para o Brasil melhorar de uma vez por todas.",
          tags: ["progressao-fraca", "c3"],
          candidates: [
            { id: "i1", label: "Parataxe pobre (frases curtas justapostas)", competency: "C4", present: true, note: "Falta articulação entre as frases." },
            { id: "i2", label: "Ausência de progressão (enumeração sem desenvolvimento)", competency: "C3", present: true, note: "Lista problemas sem analisar nenhum." },
            { id: "i3", label: "Fechamento clichê ('de uma vez por todas')", competency: "C3", present: true, note: "Expressão vazia que não conclui nada." },
            { id: "i4", label: "Erro de regência verbal", competency: "C1", present: false, note: "Não há desvio de regência." },
            { id: "i5", label: "Proposta que fere direitos humanos", competency: "C5", present: false, note: "Não há proposta no trecho." },
          ],
        },
        {
          id: "c4",
          paragraph:
            "Portanto, o governo tem que resolver esse problema rapidamente, pois a população está cansada e merece uma vida melhor e mais digna em todos os sentidos possíveis.",
          tags: ["intervencao-incompleta", "c5"],
          candidates: [
            { id: "i1", label: "Proposta sem meio nem detalhamento", competency: "C5", present: true, note: "'O governo tem que resolver' não diz como." },
            { id: "i2", label: "Agente genérico ('o governo')", competency: "C5", present: true, note: "Falta especificar o órgão/agente." },
            { id: "i3", label: "Apelo emocional vago ('merece vida digna')", competency: "C3", present: true, note: "Substitui argumento por comoção." },
            { id: "i4", label: "Desvio de concordância", competency: "C1", present: false, note: "Gramaticalmente correto." },
            { id: "i5", label: "Repetição lexical excessiva", competency: "C4", present: false, note: "Não há repetição relevante aqui." },
          ],
        },
        {
          id: "c5",
          paragraph:
            "Segundo o filósofo grego Aristóteles, criador da teoria da relatividade, o ser humano é um animal social; assim, é natural que busque as redes sociais para se conectar com os outros.",
          tags: ["repertorio-decorativo", "c2"],
          candidates: [
            { id: "i1", label: "Repertório factualmente incorreto", competency: "C2", present: true, note: "Aristóteles não criou a teoria da relatividade — erro grave de repertório." },
            { id: "i2", label: "Salto lógico (do conceito ao uso de redes)", competency: "C3", present: true, note: "'Animal social' não implica diretamente 'buscar redes sociais'." },
            { id: "i3", label: "Erro de pontuação no ponto e vírgula", competency: "C1", present: false, note: "O ponto e vírgula está bem empregado." },
            { id: "i4", label: "Fuga total ao tema", competency: "C2", present: false, note: "Tangencia, mas não foge totalmente." },
            { id: "i5", label: "Ausência de conectivos", competency: "C4", present: false, note: "Há conectivos ('assim'); a coesão não é o problema central." },
          ],
        },
      ],
    },
  },
];
