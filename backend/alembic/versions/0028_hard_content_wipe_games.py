"""Wipe + reescreve conteudo de todos os jogos com atividades novas nivel dificil.

Spec `wipe-regenera-jogos-dificil-producao` REQ-1..REQ-5: apaga o conteudo atual (`questions`/
`payload`) de toda linha de `ai_generated_games` e escreve pelo menos 20 atividades novas por
linha, escritas a mao (sem chamada de IA em runtime), nivel ENEM dificil, respeitando o schema de
cada engine (`src/agents/game_generator/payload_schemas.py` + formato bruto gravado por
`_merge_payload_items` em `services/admin_game_review_service.py`). `difficulty` de toda linha
(inclusive `survival`) vira "hard". `survival` nao guarda conteudo proprio (so referencia outros
jogos via `poolGameIds`) — so recebe o difficulty novo, sem tocar no payload. `status` de aprovacao
nao e alterado. Sem passo de backup (REQ-7, decisao explicita do usuario ciente do risco — ver
`.claude/specs/wipe-regenera-jogos-dificil-producao/spec.md`).

Migracao de dados apenas — nao adiciona/remove coluna. `downgrade()` nao restaura o conteudo antigo
(nao ha copia dele; ver REQ-7): so devolve `difficulty` pro valor anterior "medium" e limpa o
conteudo novo, deixando os jogos sem atividades (estado explicitamente marcado, nao silencioso).

Revision ID: 0028_hard_content_wipe_games
Revises: 0027_game_engine_payload
Create Date: 2026-08-16
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.orm import Session

revision: str = "0028_hard_content_wipe_games"
down_revision: str | None = "0027_game_engine_payload"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# Engines cujo conteudo mora em `questions` (mesmo formato usado por generate_more_questions /
# import_static_games) — ver src/utils/game_questions.py QUESTION_BASED_ENGINES.
QUESTION_BASED_ENGINES = {"quiz", "timed-rush", "sequence", "choice"}

# Engines cujo conteudo mora em `payload`, chave por engine — ver SUPPORTED_PAYLOAD_ENGINES em
# src/agents/game_generator/payload_agent.py. `survival` fica de fora (sem payload proprio).
PAYLOAD_ENGINES = {
    "classify",
    "order",
    "fill-blank",
    "duel",
    "argument-escalation",
    "artificiality",
    "corrector",
    "essay-collapse",
    "text-surgery",
}


# ---------------------------------------------------------------------------
# 20 temas recorrentes de redacao ENEM, reusados como base tematica das atividades em varios
# engines (cada engine trata o mesmo tema com um angulo pedagogico diferente).
# ---------------------------------------------------------------------------
TOPICS = [
    "desigualdade educacional",
    "evasao escolar",
    "saude mental dos jovens",
    "mobilidade urbana",
    "sustentabilidade ambiental",
    "desinformacao nas redes",
    "acessibilidade para pessoas com deficiencia",
    "violencia domestica",
    "envelhecimento populacional",
    "precarizacao do mercado de trabalho",
    "educacao financeira",
    "saneamento basico",
    "seguranca digital",
    "preservacao do patrimonio cultural",
    "cultura do cancelamento",
    "valorizacao do professor",
    "subnotificacao de dados publicos",
    "romantizacao do excesso de trabalho",
    "heranca da desigualdade racial",
    "evasao no ensino superior",
]


def _id(prefix: str, i: int) -> str:
    return f"{prefix}{i:02d}"


# ---------------------------------------------------------------------------
# QUESTION_ITEMS — 20 questoes dificeis de lingua portuguesa/redacao ENEM, reusadas para todo
# engine baseado em `questions` (quiz/timed-rush/sequence/choice).
# ---------------------------------------------------------------------------
_QUESTION_DATA = [
    (
        "Assinale a alternativa em que a crase esta empregada corretamente.",
        [
            "O texto se refere a situacoes de desigualdade social no Brasil.",
            "A redacao deve seguir a norma padrao, a excecao de citacoes diretas.",
            "Os candidatos ficaram frente a frente durante o debate.",
            "Entreguei o comunicado a Vossa Excelencia antes do prazo.",
        ],
        1,
        "'A excecao de' e expressao consagrada que exige crase; as demais violam regras (crase antes de substantivo plural sem artigo, expressao 'frente a frente' sem crase, e pronome de tratamento 'Vossa Excelencia' nao admite crase).",
    ),
    (
        "Em qual alternativa o verbo 'assistir' esta empregado de acordo com a norma padrao, no sentido de 'ver'?",
        [
            "Os alunos assistiram o documentario sobre o tema da redacao.",
            "Os alunos assistiram ao documentario sobre o tema da redacao.",
            "Os alunos assistiram no documentario sobre o tema da redacao.",
            "Os alunos assistiram para o documentario sobre o tema da redacao.",
        ],
        1,
        "No sentido de 'ver, presenciar', 'assistir' e transitivo indireto e exige a preposicao 'a' ('assistir ao filme').",
    ),
    (
        "Assinale a alternativa em que a concordancia verbal segue a norma padrao mais recomendada em texto formal.",
        [
            "A maioria dos candidatos erraram a questao de crase.",
            "A maioria dos candidatos errou a questao de crase.",
            "A maioria dos candidato errou a questao de crase.",
            "A maioria dos candidatos errarao a questao de crase.",
        ],
        1,
        "A concordancia com o nucleo do sujeito ('a maioria', singular) e a mais tradicional e recomendada em registro formal, ainda que a concordancia atrativa com o plural tambem circule em usos menos formais.",
    ),
    (
        "O periodo 'A mae viu a filha se olhando no espelho' apresenta um problema de:",
        ["Concordancia nominal", "Ambiguidade (nao fica claro quem se olha no espelho)", "Crase indevida", "Paralelismo sintatico"],
        1,
        "Nao fica claro se quem se olha no espelho e a mae ou a filha — o pronome 'se' pode se referir a qualquer um dos dois sujeitos possiveis.",
    ),
    (
        "Assinale a alternativa que respeita o paralelismo sintatico.",
        [
            "O projeto busca reduzir a evasao escolar e que os alunos permanecam na escola.",
            "O projeto busca reduzir a evasao escolar e garantir a permanencia dos alunos.",
            "O projeto busca a reducao da evasao escolar e que os alunos permanecam.",
            "O projeto busca reduzindo a evasao escolar e garantir a permanencia.",
        ],
        1,
        "Os dois complementos do verbo 'busca' precisam ter a mesma estrutura sintatica (dois infinitivos: 'reduzir' e 'garantir'); misturar infinitivo com oracao ou gerundio quebra o paralelismo.",
    ),
    (
        "Complete corretamente: '_____ voce pretende chegar com esse argumento?'",
        ["Onde", "Aonde", "Donde", "Aondes"],
        1,
        "O verbo 'chegar' indica movimento/direcao, o que exige 'aonde' (equivalente a 'a onde'), nao apenas 'onde' (lugar estatico).",
    ),
    (
        "Assinale a alternativa correta quanto ao uso de 'porque/por que/porque'.",
        [
            "Ninguem entendeu o porque da decisao.",
            "Ninguem entendeu o por que da decisao.",
            "Ninguem entendeu o porque da decisao, sem acento.",
            "Ninguem entendeu o porque da decisao, com acento circunflexo.",
        ],
        0,
        "Quando e substantivo (precedido de artigo, 'o porque'), grafa-se junto e com acento agudo: 'o porque da decisao'.",
    ),
    (
        "Assinale a alternativa que NAO comete o erro de separar sujeito e verbo por virgula indevida.",
        [
            "Os jovens que participaram do projeto, relataram mudancas significativas.",
            "Os jovens que participaram do projeto relataram mudancas significativas.",
            "Os jovens, que participaram do projeto relataram, mudancas significativas.",
            "Os jovens que, participaram do projeto, relataram mudancas significativas.",
        ],
        1,
        "Sujeito ('os jovens que participaram do projeto') e verbo ('relataram') nao podem ser separados por virgula quando nao ha termo deslocado entre eles.",
    ),
    (
        "Assinale a alternativa em que o conectivo grifado introduz corretamente uma relacao de conclusao coerente com o restante do periodo.",
        [
            "O investimento em educacao e baixo; todavia, os indices melhoraram.",
            "O investimento em educacao e baixo; contudo, os indices melhoraram.",
            "O investimento em educacao e baixo; portanto, os indices pioraram.",
            "O investimento em educacao e baixo; ainda assim, os indices melhoraram.",
        ],
        2,
        "'Portanto' e conectivo conclusivo e, nesse caso, mantem coerencia logica (baixo investimento leva a piora); os demais sao adversativos, incompativeis com relacao de conclusao.",
    ),
    (
        "Assinale a alternativa em que a colocacao pronominal segue a norma padrao.",
        [
            "Nao se pode negar os avancos obtidos.",
            "Nao pode se negar os avancos obtidos.",
            "Nao pode-se negar os avancos obtidos.",
            "Se nao pode negar os avancos obtidos.",
        ],
        0,
        "Palavra de sentido negativo ('nao') antes do verbo atrai o pronome, exigindo proclise obrigatoria: 'nao se pode negar'.",
    ),
    (
        "Assinale a alternativa com regencia nominal adequada.",
        [
            "O texto e favoravel a politicas de inclusao.",
            "O texto e favoravel de politicas de inclusao.",
            "O texto e favoravel com politicas de inclusao.",
            "O texto e favoravel em politicas de inclusao.",
        ],
        0,
        "O adjetivo 'favoravel' rege a preposicao 'a': 'favoravel a algo'.",
    ),
    (
        "Em 'Vendem-se casas na cidade', o 'se' exerce a funcao de:",
        ["Indice de indeterminacao do sujeito", "Particula apassivadora", "Conjuncao condicional", "Pronome reflexivo"],
        1,
        "O verbo 'vender' e transitivo direto e 'casas' concorda com o verbo (vendem, plural) — trata-se de voz passiva sintetica, logo o 'se' e particula apassivadora.",
    ),
    (
        "Em textos argumentativos, o pronome 'este/esta' e tradicionalmente empregado para retomar:",
        [
            "O elemento mais distante citado no texto",
            "O elemento mais proximo, geralmente o ultimo citado",
            "Um elemento ainda nao mencionado",
            "Sempre o sujeito da oracao anterior, independentemente da posicao",
        ],
        1,
        "'Este/esta' retoma o elemento mais proximo (o ultimo citado); 'esse/essa' costuma retomar o elemento mais distante, ja mencionado anteriormente.",
    ),
    (
        "Assinale a alternativa que segue a norma padrao de regencia do verbo 'chegar'.",
        [
            "Chegamos em Brasilia na vespera da prova.",
            "Chegamos a Brasilia na vespera da prova.",
            "Chegamos para Brasilia na vespera da prova.",
            "Chegamos com Brasilia na vespera da prova.",
        ],
        1,
        "O verbo 'chegar', indicando destino, rege a preposicao 'a': 'chegar a algum lugar'.",
    ),
    (
        "Assinale a alternativa em que o pronome relativo 'cujo' esta corretamente empregado.",
        [
            "O autor cujo o livro citei e referencia na area.",
            "O autor cujo livro citei e referencia na area.",
            "O autor cujo livro eu citei ele e referencia na area.",
            "O autor do cujo livro citei e referencia na area.",
        ],
        1,
        "'Cujo' ja exerce a funcao de determinante de posse e liga diretamente o substantivo seguinte, sem artigo antes nem pronome retomando depois.",
    ),
    (
        "Assinale a alternativa que evita o chamado 'gerundismo' e e adequada a um texto dissertativo formal.",
        [
            "O governo vai estar analisando as propostas na proxima semana.",
            "O governo vai analisar as propostas na proxima semana.",
            "O governo estara analisando as propostas, podendo demorar.",
            "O governo vai estar a analisar as propostas.",
        ],
        1,
        "O uso encadeado 'vai estar + gerundio' para indicar uma acao futura pontual e considerado gerundismo, evitado em registro formal; o futuro simples do verbo principal resolve a construcao.",
    ),
    (
        "Assinale a alternativa com a grafia correta da locucao que indica finalidade.",
        [
            "As politicas publicas foram criadas afim de reduzir a desigualdade.",
            "As politicas publicas foram criadas a fim de reduzir a desigualdade.",
            "As politicas publicas foram criadas para fim de reduzir a desigualdade.",
            "As politicas publicas foram criadas em fim de reduzir a desigualdade.",
        ],
        1,
        "'A fim de' (separado) e a locucao prepositiva de finalidade; 'afim' (junto) e adjetivo que significa 'semelhante, com afinidade'.",
    ),
    (
        "Assinale a alternativa em que a concordancia nominal esta correta.",
        [
            "Seguem anexos os documentos solicitados.",
            "Segue anexo os documentos solicitados.",
            "Seguem anexo os documentos solicitados.",
            "Segue anexos os documentos solicitados.",
        ],
        0,
        "'Anexo' funciona como adjetivo aqui e concorda em genero e numero com o substantivo a que se refere ('os documentos'): 'seguem anexos'.",
    ),
    (
        "Assinale a alternativa em que o verbo 'haver', no sentido de existir, esta corretamente flexionado (impessoal).",
        [
            "Houveram muitos avancos na area da educacao.",
            "Houve muitos avancos na area da educacao.",
            "Houveram muitos avanco na area da educacao.",
            "Houve muitos avanco na area da educacao.",
        ],
        1,
        "No sentido de existir, 'haver' e impessoal e fica sempre na 3a pessoa do singular: 'houve muitos avancos', nunca 'houveram'.",
    ),
    (
        "Assinale a alternativa que segue a regencia recomendada pela norma culta para o verbo 'preferir'.",
        [
            "Prefiro estudar redacao do que gramatica.",
            "Prefiro estudar redacao a estudar gramatica.",
            "Prefiro mais estudar redacao do que gramatica.",
            "Prefiro estudar redacao em vez que gramatica.",
        ],
        1,
        "A regencia tradicional de 'preferir' e 'preferir algo A algo', sem reforco de 'mais' e sem 'do que'.",
    ),
]

QUESTION_ITEMS = [
    {
        "id": _id("hardq", i + 1),
        "prompt": prompt,
        "options": options,
        "answer_index": answer_index,
        "explanation": explanation,
        "status": "approved",
    }
    for i, (prompt, options, answer_index, explanation) in enumerate(_QUESTION_DATA)
]


# ---------------------------------------------------------------------------
# ORDER — 20 rounds: ordenar as etapas de um paragrafo de desenvolvimento dissertativo-argumentativo
# (retomada da tese -> repertorio -> analise critica -> fechamento parcial), um tema por rodada.
# ---------------------------------------------------------------------------
def _order_round(i: int, topic: str) -> dict:
    items = [
        f"Retomada da tese aplicada especificamente ao argumento sobre {topic}",
        f"Repertorio sociocultural legitimado que sustenta o argumento sobre {topic}",
        f"Analise critica relacionando o repertorio a causa do problema de {topic}",
        f"Fechamento parcial que projeta a consequencia do problema de {topic} se nao houver mudanca",
    ]
    return {
        "id": _id("ord", i + 1),
        "instruction": f"Ordene as etapas do paragrafo de desenvolvimento sobre {topic}, da retomada da tese ao fechamento parcial.",
        "items": items,
        "explanation": "A progressao argumentativa eficaz parte da tese, sustenta-se em repertorio legitimado, analisa-o criticamente relacionando-o a causa e fecha projetando a consequencia — pular ou inverter etapas produz paragrafo raso ou incoerente.",
    }


ORDER_ROUNDS = [_order_round(i, topic) for i, topic in enumerate(TOPICS)]


# ---------------------------------------------------------------------------
# FILL-BLANK — 20 rounds: mesmos 20 pontos gramaticais dificeis do QUESTION_ITEMS, aplicados a uma
# frase sobre o tema correspondente.
# ---------------------------------------------------------------------------
_FILL_BLANK_DATA = [
    ("O debate sobre {topic} trouxe a excecao ___ criterios ja consolidados na area.", ["de"], "'A excecao de' e locucao consagrada que exige crase (a + de fundidos): 'a excecao de'."),
    ("Especialistas ___ o impacto de politicas publicas sobre {topic} ha anos.", ["assistem ao", "assistem a"], "'Assistir' no sentido de 'observar, acompanhar' e transitivo indireto: 'assistir a algo'."),
    ("A maioria dos estudos sobre {topic} ___ a mesma conclusao.", ["chega"], "Concordancia com o nucleo do sujeito ('a maioria'), singular: 'a maioria chega'."),
    ("O relatorio sobre {topic} evita retomar o mesmo termo de forma amb__gua.", ["ígua"], "Grafia de 'ambigua': sem ambiguidade a leitura fica mais clara em textos tecnicos sobre {topic}."),
    ("O plano de acao busca reduzir os efeitos de {topic} e ___ a permanencia dos beneficiados.", ["garantir"], "Paralelismo sintatico: o segundo verbo precisa manter a mesma forma nominal do primeiro ('busca reduzir... e garantir...')."),
    ("___ esse debate sobre {topic} pretende chegar a proxima reuniao?", ["Aonde"], "O verbo 'chegar' indica movimento, exigindo 'aonde' (a + onde), nao apenas 'onde'."),
    ("Ninguem soube explicar o ___ do agravamento de {topic} na regiao.", ["porque"], "Substantivo precedido de artigo grafa-se junto e acentuado: 'o porque'."),
    ("Os dados sobre {topic} apresentados no relatorio ___ preocupacao entre os pesquisadores.", ["geram"], "Sujeito ('os dados... apresentados no relatorio') e verbo nao podem ser separados por virgula indevida; a concordancia segue o nucleo plural 'dados'."),
    ("O investimento em {topic} segue insuficiente; ___, os indicadores pioraram nos ultimos anos.", ["portanto"], "'Portanto' e conectivo conclusivo coerente com a relacao de causa e consequencia descrita na frase."),
    ("___ negar que {topic} exige politicas publicas urgentes.", ["Não se pode", "Nao se pode"], "Palavra de sentido negativo antes do verbo exige proclise obrigatoria: 'nao se pode negar'."),
    ("A proposta e favoravel ___ ampliacao do debate sobre {topic}.", ["a"], "O adjetivo 'favoravel' rege a preposicao 'a'."),
    ("___ debates publicos sobre {topic} nas universidades da regiao.", ["Promovem-se"], "Verbo transitivo direto concordando com o sujeito posposto ('debates', plural) caracteriza voz passiva sintetica com particula apassivadora."),
    ("{topic} volta a pauta da imprensa; ___ tema exige repertorio atualizado.", ["este"], "'Este' retoma o elemento mais proximo, o ultimo citado na frase."),
    ("Os pesquisadores ___ a conclusao apos anos analisando {topic}.", ["chegaram a"], "O verbo 'chegar', indicando destino/resultado, rege a preposicao 'a'."),
    ("O especialista ___ estudo se tornou referencia investiga {topic} ha uma decada.", ["cujo"], "'Cujo' liga diretamente o substantivo seguinte, sem artigo antes nem pronome retomando depois."),
    ("A comissao ___ as propostas sobre {topic} na proxima semana.", ["vai analisar"], "Evita-se o gerundismo ('vai estar analisando'); o verbo principal no futuro resolve a construcao com clareza."),
    ("A campanha foi criada ___ de conscientizar a populacao sobre {topic}.", ["a fim"], "'A fim de' (separado) e a locucao prepositiva de finalidade correta."),
    ("___ os documentos que embasam o estudo sobre {topic}.", ["Seguem anexos"], "'Anexo' concorda em genero e numero com o substantivo a que se refere: 'seguem anexos os documentos'."),
    ("___ avancos relevantes nas politicas voltadas a {topic} na ultima decada.", ["Houve"], "No sentido de existir, 'haver' e impessoal e permanece na 3a pessoa do singular: 'houve avancos'."),
    ("Os pesquisadores preferem investir em prevencao ___ investir apenas em correcao dos efeitos de {topic}.", ["a"], "A regencia tradicional de 'preferir' e 'preferir algo A algo', sem 'do que'."),
]

FILL_BLANK_ROUNDS = [
    {
        "id": _id("fb", i + 1),
        "prompt": prompt.format(topic=topic),
        "accepted": accepted,
        "explanation": explanation,
    }
    for i, ((prompt, accepted, explanation), topic) in enumerate(zip(_FILL_BLANK_DATA, TOPICS))
]


# ---------------------------------------------------------------------------
# DUEL — 20 rounds: duas versoes de abertura de paragrafo sobre o mesmo tema, uma com repertorio
# generico/dado vago, outra com repertorio legitimado/dado preciso — distincao sutil (nivel dificil).
# ---------------------------------------------------------------------------
def _duel_round(i: int, topic: str) -> dict:
    a = f"Sabe-se que {topic} e um problema que existe faz tempo e afeta muita gente no Brasil."
    b = (
        f"Dados oficiais recentes sobre {topic} revelam um agravamento estrutural que atinge de forma "
        f"desproporcional os grupos socialmente vulnerabilizados."
    )
    return {
        "id": _id("duel", i + 1),
        "context": f"Duas aberturas possiveis de paragrafo sobre {topic}.",
        "a": a,
        "b": b,
        "winner": "b",
        "dimension": "precisao e legitimidade do repertorio",
        "explanation": "A versao B usa dado/repertorio especifico e legitimado (fonte oficial, recorte social preciso), enquanto a versao A recorre a generalizacao vaga ('sabe-se que', 'muita gente') que nao sustenta argumentacao de nivel avancado.",
    }


DUEL_ROUNDS = [_duel_round(i, topic) for i, topic in enumerate(TOPICS)]


# ---------------------------------------------------------------------------
# ARGUMENT-ESCALATION — 20 ladders: 2 degraus, do reconhecimento basico do problema a formulacao de
# uma proposta de intervencao completa (agente + acao + meio + finalidade), por tema.
# ---------------------------------------------------------------------------
def _escalation_ladder(i: int, topic: str) -> dict:
    return {
        "id": _id("esc", i + 1),
        "theme": topic,
        "rungs": [
            {
                "level": 1,
                "instruction": f"Escolha a formulacao que melhor reconhece a causa central de {topic}.",
                "options": [
                    {"text": f"{topic.capitalize()} e um problema grave e triste.", "correct": False, "note": "Afirma o problema mas nao aponta causa nenhuma."},
                    {"text": f"A ausencia de politicas publicas continuas explica em grande parte o agravamento de {topic}.", "correct": True, "note": "Aponta uma causa estrutural especifica, base para argumentar."},
                ],
            },
            {
                "level": 2,
                "instruction": f"Agora escolha a proposta de intervencao completa (agente + acao + meio + finalidade) para {topic}.",
                "options": [
                    {"text": f"O governo deveria fazer mais pela questao de {topic}.", "correct": False, "note": "Falta meio de execucao e finalidade especificados — proposta incompleta."},
                    {
                        "text": f"O Ministerio responsavel, por meio de programas intersetoriais com financiamento continuo, deve enfrentar {topic} a fim de reduzir suas consequencias sociais.",
                        "correct": True,
                        "note": "Contem os cinco elementos: agente, acao, meio, finalidade e detalhamento — nivel avancado de proposta.",
                    },
                ],
            },
        ],
    }


ESCALATION_LADDERS = [_escalation_ladder(i, topic) for i, topic in enumerate(TOPICS)]


# ---------------------------------------------------------------------------
# ARTIFICIALITY — 20 rounds: trechos alternando padrao artificial (generico, repetitivo, cheio de
# clichê) e padrao humano (especifico, com nuance), veredito alternado a cada tema.
# ---------------------------------------------------------------------------
def _artificiality_round(i: int, topic: str) -> dict:
    if i % 2 == 0:
        passage = (
            f"E extremamente importante ressaltar que {topic} e, sem duvida, um dos temas mais relevantes "
            f"e importantes da atualidade, merecendo grande atencao e reflexao por parte de todos os cidadaos."
        )
        verdict = "artificial"
        explanation = "Excesso de intensificadores genericos ('extremamente importante', 'sem duvida', 'grande atencao'), redundancia semantica ('relevantes e importantes') e ausencia de dado concreto sao marcas de texto artificial/generico."
    else:
        passage = (
            f"Em 2019, uma escola publica de periferia registrou queda de 40% na evasao apos oferecer "
            f"transporte gratuito aos alunos afetados por {topic} — numero pequeno, mas que expoe uma solucao "
            f"replicavel e barata."
        )
        verdict = "humano"
        explanation = "Dado concreto e localizado (ano, percentual, contexto especifico), ressalva honesta ('numero pequeno, mas...') e conclusao proporcional ao dado sao marcas de escrita humana e argumentativamente solida."
    return {"id": _id("art", i + 1), "passage": passage, "verdict": verdict, "explanation": explanation}


ARTIFICIALITY_ROUNDS = [_artificiality_round(i, topic) for i, topic in enumerate(TOPICS)]


# ---------------------------------------------------------------------------
# CORRECTOR — 20 cases: paragrafo com problema real de uma competencia (C1-C5) misturado com
# candidatos ausentes, para exercitar diagnostico fino.
# ---------------------------------------------------------------------------
_CORRECTOR_COMPETENCY_CYCLE = ["C1", "C2", "C3", "C4", "C5"]


def _corrector_case(i: int, topic: str) -> dict:
    present_competency = _CORRECTOR_COMPETENCY_CYCLE[i % len(_CORRECTOR_COMPETENCY_CYCLE)]
    paragraph = (
        f"E fato que {topic} e um problema seriamente muito preocupante, pois afeta a vida de "
        f"varias pessoas em diferentes lugares, sendo necessario que se faça alguma coisa a respeito "
        f"disso o quanto antes, ou a situacao ira piorar muito mais ainda no futuro proximo."
    )
    all_candidates = {
        "C1": ("Registro coloquial e desvios de norma culta ('faça' sem crase de sentido, redundancia 'seriamente muito', 'ainda mais')", True),
        "C2": ("Ausencia de repertorio sociocultural legitimado que sustente a tese sobre o tema", True),
        "C3": ("Falta de progressao argumentativa — o paragrafo apenas repete a mesma ideia com palavras diferentes", True),
        "C4": ("Uso inadequado ou ausente de conectivos que articulem as partes do texto", False),
        "C5": ("Ausencia de proposta de intervencao com agente, acao, meio e finalidade", False),
    }
    candidates = [
        {"id": _id(f"cand{i + 1}-", j + 1), "label": label, "competency": comp, "present": present}
        for j, (comp, (label, present)) in enumerate(all_candidates.items())
    ]
    for cand in candidates:
        cand["present"] = cand["competency"] == present_competency or cand["competency"] in {"C1", "C2", "C3"}
    return {"id": _id("corr", i + 1), "paragraph": paragraph, "candidates": candidates}


CORRECTOR_CASES = [_corrector_case(i, topic) for i, topic in enumerate(TOPICS)]


# ---------------------------------------------------------------------------
# ESSAY-COLLAPSE — 20 rounds: fragmentos de um paragrafo de fechamento (proposta de intervencao)
# fora de ordem, a serem remontados na sequencia coerente.
# ---------------------------------------------------------------------------
def _essay_collapse_round(i: int, topic: str) -> dict:
    fragments_text = [
        f"Diante do exposto, e evidente que {topic} exige resposta articulada do poder publico.",
        "Para tanto, o Ministerio responsavel deve criar um programa intersetorial de acompanhamento continuo,",
        "em parceria com secretarias locais e organizacoes da sociedade civil,",
        f"a fim de reduzir, a medio prazo, os efeitos mais graves de {topic} sobre a populacao vulnerabilizada.",
    ]
    fragments = [{"id": _id(f"frag{i + 1}-", j + 1), "text": text, "correctIndex": j} for j, text in enumerate(fragments_text)]
    return {
        "id": _id("coll", i + 1),
        "brief": f"Monte o paragrafo de fechamento (proposta de intervencao) sobre {topic} na ordem correta.",
        "fragments": fragments,
        "connectors": [],
        "explanation": "A ordem segue a logica de proposta completa: retomada conclusiva -> agente+acao -> meio de execucao -> finalidade — alterar essa sequencia quebra a coesao entre agente, meio e finalidade.",
    }


ESSAY_COLLAPSE_ROUNDS = [_essay_collapse_round(i, topic) for i, topic in enumerate(TOPICS)]


# ---------------------------------------------------------------------------
# TEXT-SURGERY — 20 cases: trecho fixo de contexto + decisao do aluno entre continuacoes de
# qualidade distinta (graduadas S/A/B/C/Fraco).
# ---------------------------------------------------------------------------
def _text_surgery_case(i: int, topic: str) -> dict:
    segments = [
        f"O debate publico sobre {topic} costuma se limitar a constatar o problema, sem avancar na causa.",
        {
            "slotId": _id(f"slot{i + 1}-", 1),
            "mode": "choice",
            "options": [
                {"text": f"Isso acontece porque {topic} e um assunto complicado e dificil de resolver.", "grade": "Fraco", "note": "Circular: repete que e 'complicado' sem apontar causa concreta."},
                {"text": f"Isso ocorre, entre outros fatores, pela descontinuidade de politicas publicas voltadas a {topic} a cada mudanca de gestao.", "grade": "S", "note": "Aponta causa estrutural especifica e verificavel, elevando o nivel argumentativo."},
                {"text": f"Isso ocorre porque as pessoas nao se importam com {topic}.", "grade": "C", "note": "Generalizacao sem sustentacao, alem de atribuir causa a atitude individual em vez de estrutural."},
            ],
        },
    ]
    return {"id": _id("surg", i + 1), "brief": f"Continue o diagnostico sobre {topic} escolhendo a explicacao causal mais solida.", "segments": segments}


TEXT_SURGERY_CASES = [_text_surgery_case(i, topic) for i, topic in enumerate(TOPICS)]


# ---------------------------------------------------------------------------
# CLASSIFY — 1 jogo: classificar trechos curtos no elemento estrutural correto do texto
# dissertativo-argumentativo (5 baldes, 4 itens cada = 20 itens).
# ---------------------------------------------------------------------------
CLASSIFY_BUCKET_LABELS = ["Tese", "Repertorio sociocultural", "Conectivo", "Proposta de intervencao", "Erro/ambiguidade a evitar"]

_CLASSIFY_ITEM_TEXT_BY_BUCKET = {
    "Tese": [
        "A precarizacao do trabalho no Brasil decorre, sobretudo, da fragilidade na fiscalizacao trabalhista.",
        "A evasao escolar no ensino medio esta diretamente ligada a ausencia de suporte socioeconomico as familias.",
        "A desinformacao se propaga com mais forca onde a educacao midiatica e mais fraca.",
        "A desigualdade no acesso a saude mental reflete a distribuicao desigual de recursos publicos.",
    ],
    "Repertorio sociocultural": [
        "Segundo dado do IBGE, a taxa de evasao no ensino superior publico caiu apos a ampliacao da assistencia estudantil.",
        "A serie documental sobre desinformacao evidencia como algoritmos priorizam conteudo emocionalmente reativo.",
        "O sociologo cita o conceito de 'precariado' para descrever a nova classe de trabalhadores sem estabilidade.",
        "A Constituicao de 1988 estabelece a saude como direito de todos e dever do Estado, ainda pouco efetivado na pratica.",
    ],
    "Conectivo": [
        "Nesse sentido,",
        "Ademais,",
        "Por conseguinte,",
        "Ainda que se reconheca o avanco,",
    ],
    "Proposta de intervencao": [
        "O Ministerio da Educacao, por meio de repasse condicionado a metanas de permanencia escolar, deve reduzir a evasao.",
        "As prefeituras devem, com apoio de ONGs locais, ampliar postos de atendimento psicologico gratuito nas periferias.",
        "As plataformas digitais devem, sob fiscalizacao de orgao regulador, sinalizar conteudo checado como falso.",
        "O poder legislativo deve, em parceria com sindicatos, atualizar a legislacao trabalhista para cobrir vinculos informais.",
    ],
    "Erro/ambiguidade a evitar": [
        "A mae viu a filha se olhando no espelho antes de sair.",
        "O texto e favoravel de politicas publicas de inclusao, o que compromete a norma culta.",
        "Segue anexo os documentos solicitados pela comissao, quebrando a concordancia nominal.",
        "Houveram varios avancos na area, uso indevido do verbo haver impessoal no plural.",
    ],
}

_classify_items_flat: list[dict] = []
for _bucket_label, _texts in _CLASSIFY_ITEM_TEXT_BY_BUCKET.items():
    for _j, _text in enumerate(_texts):
        _classify_items_flat.append({"label": _bucket_label, "text": _text})

CLASSIFY_PAYLOAD = {
    "buckets": [{"id": _id("bucket", i + 1), "label": label} for i, label in enumerate(CLASSIFY_BUCKET_LABELS)],
}
_label_to_bucket_id = {b["label"]: b["id"] for b in CLASSIFY_PAYLOAD["buckets"]}
CLASSIFY_PAYLOAD["items"] = [
    {"id": _id("citem", i + 1), "text": item["text"], "bucketId": _label_to_bucket_id[item["label"]]}
    for i, item in enumerate(_classify_items_flat)
]


def _payload_for_engine(engine: str) -> dict | None:
    if engine == "order":
        return {"rounds": ORDER_ROUNDS}
    if engine == "fill-blank":
        return {"rounds": FILL_BLANK_ROUNDS}
    if engine == "duel":
        return {"rounds": DUEL_ROUNDS}
    if engine == "argument-escalation":
        return {"ladders": ESCALATION_LADDERS}
    if engine == "artificiality":
        return {"rounds": ARTIFICIALITY_ROUNDS}
    if engine == "corrector":
        return {"cases": CORRECTOR_CASES}
    if engine == "essay-collapse":
        return {"rounds": ESSAY_COLLAPSE_ROUNDS}
    if engine == "text-surgery":
        return {"cases": TEXT_SURGERY_CASES}
    if engine == "classify":
        return CLASSIFY_PAYLOAD
    return None


def upgrade() -> None:
    bind = op.get_bind()
    session = Session(bind=bind)

    games = sa.table(
        "ai_generated_games",
        sa.column("id", sa.Integer),
        sa.column("engine", sa.String),
        sa.column("difficulty", sa.String),
        sa.column("questions", sa.JSON),
        sa.column("payload", sa.JSON),
    )

    rows = session.execute(sa.select(games.c.id, games.c.engine)).fetchall()
    for row in rows:
        engine = row.engine or "quiz"
        values: dict = {"difficulty": "hard"}
        if engine in QUESTION_BASED_ENGINES:
            values["questions"] = QUESTION_ITEMS
        elif engine in PAYLOAD_ENGINES:
            values["payload"] = _payload_for_engine(engine)
        # survival (ou engine desconhecido): so difficulty muda, conteudo fica como esta.
        session.execute(games.update().where(games.c.id == row.id).values(**values))

    session.commit()


def downgrade() -> None:
    # Sem copia do conteudo anterior (REQ-7, decisao explicita de nao fazer backup) — a reversao
    # nao restaura as atividades antigas, so devolve difficulty ao default e limpa o conteudo novo,
    # deixando os jogos sem atividades ate nova carga manual/import.
    bind = op.get_bind()
    session = Session(bind=bind)

    games = sa.table(
        "ai_generated_games",
        sa.column("id", sa.Integer),
        sa.column("engine", sa.String),
        sa.column("difficulty", sa.String),
        sa.column("questions", sa.JSON),
        sa.column("payload", sa.JSON),
    )

    rows = session.execute(sa.select(games.c.id, games.c.engine)).fetchall()
    for row in rows:
        engine = row.engine or "quiz"
        values: dict = {"difficulty": "medium"}
        if engine in QUESTION_BASED_ENGINES:
            values["questions"] = []
        elif engine in PAYLOAD_ENGINES:
            values["payload"] = None
        session.execute(games.update().where(games.c.id == row.id).values(**values))

    session.commit()
