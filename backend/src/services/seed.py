from datetime import UTC, date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.config.security import get_password_hash
from src.config.settings import settings
from src.models import (
    Difficulty,
    Essay,
    EssayCorrection,
    EssayStatus,
    EssayTheme,
    Exercise,
    Goal,
    Lesson,
    LessonProgress,
    Module,
    User,
    UserRole,
)

EXERCISE_SPECS = [
    {
        "module": "Fundamentos da Redacao",
        "lesson": "Como decodificar o tema",
        "statement": "Em uma proposta sobre invisibilidade do trabalho de cuidado, qual alternativa melhor identifica o recorte tematico?",
        "options": [
            "A) Qualquer atividade profissional feminina.",
            "B) A falta de reconhecimento social e economico de atividades de cuidado.",
            "C) A defesa de que todo trabalho deve ser voluntario.",
            "D) A historia do mercado financeiro brasileiro.",
            "E) O fim das relacoes familiares contemporaneas.",
        ],
        "correct_answer": "B",
        "explanation": "O recorte combina invisibilidade, cuidado e reconhecimento social/economico, nao apenas trabalho feminino de forma ampla.",
        "skill": "Compreensao do tema",
        "difficulty": Difficulty.MEDIUM,
    },
    {
        "module": "Competencias do ENEM",
        "lesson": "Competencia 5 sem formula vazia",
        "statement": "Qual item completa melhor uma proposta de intervencao ENEM?",
        "options": [
            "A) Apenas citar o governo.",
            "B) Apresentar agente, acao, meio, finalidade e detalhamento.",
            "C) Encerrar com uma pergunta retorica.",
            "D) Repetir a tese da introducao.",
            "E) Usar um repertorio historico sem relacao com a solucao.",
        ],
        "correct_answer": "B",
        "explanation": "A Competencia 5 exige uma proposta detalhada, articulada ao problema e respeitosa aos direitos humanos.",
        "skill": "Competencia 5",
        "difficulty": Difficulty.EASY,
    },
    {
        "module": "Norma-padrao Essencial",
        "lesson": "Pontuacao que muda sentido",
        "statement": "Assinale a frase em que a virgula evita ambiguidade.",
        "options": [
            "A) Os alunos que estudaram passaram.",
            "B) Ao chegar em casa, revisei a redacao.",
            "C) A sociedade brasileira enfrenta desafios.",
            "D) A proposta precisa de detalhamento.",
            "E) O texto apresenta tese clara.",
        ],
        "correct_answer": "B",
        "explanation": "A virgula separa a oracao deslocada e facilita a leitura da relacao temporal.",
        "skill": "Pontuacao",
        "difficulty": Difficulty.MEDIUM,
    },
    {
        "module": "Leitura Estrategica",
        "lesson": "Inferencia em textos multimodais",
        "statement": "Em charges, a critica social costuma surgir principalmente da relacao entre:",
        "options": [
            "A) Titulo, linguagem visual e contexto.",
            "B) Numero de linhas e tamanho da fonte.",
            "C) Apenas a biografia do autor.",
            "D) Regras de acentuacao.",
            "E) Ordem alfabetica das palavras.",
        ],
        "correct_answer": "A",
        "explanation": "Textos multimodais exigem leitura integrada entre elementos verbais, visuais e contexto sociocultural.",
        "skill": "Textos multimodais",
        "difficulty": Difficulty.MEDIUM,
    },
    {
        "module": "Leitura Estrategica",
        "lesson": "Inferencia em textos multimodais",
        "statement": "Ao ler um infografico do ENEM, qual procedimento aumenta a precisao da interpretacao?",
        "options": [
            "A) Observar apenas o titulo principal.",
            "B) Relacionar dados numericos, legenda, fonte e contexto.",
            "C) Ignorar a fonte para evitar interferencias.",
            "D) Procurar a alternativa com mais palavras.",
            "E) Escolher a opcao que repete literalmente o enunciado.",
        ],
        "correct_answer": "B",
        "explanation": "Infograficos articulam linguagem verbal, visual e numerica; a leitura precisa depende da relacao entre esses elementos.",
        "skill": "Textos multimodais",
        "difficulty": Difficulty.EASY,
    },
    {
        "module": "Leitura Estrategica",
        "lesson": "Inferencia em textos multimodais",
        "statement": "Quando uma questao pede o efeito de sentido de uma ironia, o aluno deve priorizar:",
        "options": [
            "A) A contradicao entre o sentido literal e a intencao critica.",
            "B) A classificacao morfologica de todas as palavras.",
            "C) A memorizacao da biografia do autor.",
            "D) A contagem de frases do texto.",
            "E) A alternativa mais curta.",
        ],
        "correct_answer": "A",
        "explanation": "A ironia produz sentido pela distancia entre o que e dito literalmente e a critica sugerida pelo contexto.",
        "skill": "Compreensao de ironia",
        "difficulty": Difficulty.MEDIUM,
    },
    {
        "module": "Leitura Estrategica",
        "lesson": "Inferencia em textos multimodais",
        "statement": "Em textos jornalisticos opinativos, a tese costuma aparecer como:",
        "options": [
            "A) Uma enumeracao de datas sem relacao entre si.",
            "B) Uma posicao defendida sobre determinado problema.",
            "C) Uma lista de sinonimos tecnicos.",
            "D) Uma pergunta sem desenvolvimento.",
            "E) Uma citacao isolada no final do texto.",
        ],
        "correct_answer": "B",
        "explanation": "A tese e o posicionamento central que organiza argumentos e escolhas linguisticas do texto.",
        "skill": "Compreensao textual",
        "difficulty": Difficulty.EASY,
    },
    {
        "module": "Leitura Estrategica",
        "lesson": "Inferencia em textos multimodais",
        "statement": "O reconhecimento do genero textual ajuda o aluno porque permite:",
        "options": [
            "A) Ignorar o contexto de circulacao.",
            "B) Antecipar finalidade, publico e organizacao do texto.",
            "C) Responder sem ler o enunciado.",
            "D) Trocar interpretacao por opiniao pessoal.",
            "E) Eliminar todas as alternativas longas.",
        ],
        "correct_answer": "B",
        "explanation": "Genero textual orienta expectativas sobre finalidade, interlocutores, estrutura e recursos de linguagem.",
        "skill": "Generos textuais",
        "difficulty": Difficulty.MEDIUM,
    },
    {
        "module": "Leitura Estrategica",
        "lesson": "Inferencia em textos multimodais",
        "statement": "Uma inferencia valida em questoes de interpretacao deve ser baseada em:",
        "options": [
            "A) Pistas do texto e conhecimento de mundo pertinente.",
            "B) Preferencia pessoal do leitor.",
            "C) Uma palavra isolada fora de contexto.",
            "D) Chute pela alternativa mais tecnica.",
            "E) Exclusivamente na primeira frase.",
        ],
        "correct_answer": "A",
        "explanation": "Inferir nao e inventar; e construir sentido a partir de pistas textuais articuladas ao contexto.",
        "skill": "Inferencia",
        "difficulty": Difficulty.HARD,
    },
    {
        "module": "Leitura Estrategica",
        "lesson": "Inferencia em textos multimodais",
        "statement": "Em um poema, a repeticao de uma palavra pode funcionar para:",
        "options": [
            "A) Criar ritmo, reforcar uma ideia ou intensificar uma emocao.",
            "B) Provar erro gramatical obrigatorio.",
            "C) Eliminar qualquer possibilidade de interpretacao.",
            "D) Substituir a pontuacao de todo o texto.",
            "E) Transformar o texto em noticia.",
        ],
        "correct_answer": "A",
        "explanation": "A repeticao pode ter valor expressivo, ritmico e semantico, especialmente em textos literarios.",
        "skill": "Textos literarios",
        "difficulty": Difficulty.MEDIUM,
    },
    {
        "module": "Norma-padrao Essencial",
        "lesson": "Pontuacao que muda sentido",
        "statement": "Qual frase apresenta uso adequado da crase?",
        "options": [
            "A) Entreguei o projeto a escola ontem.",
            "B) Cheguei cedo a reuniao.",
            "C) Refiro-me a uma proposta ampla.",
            "D) O aluno respondeu a todas as perguntas.",
            "E) A pesquisa foi feita a lapis.",
        ],
        "correct_answer": "B",
        "explanation": "Ha crase em 'a reuniao' porque ocorre a preposicao 'a' exigida por 'chegar' e o artigo feminino 'a'.",
        "skill": "Crase",
        "difficulty": Difficulty.MEDIUM,
    },
    {
        "module": "Norma-padrao Essencial",
        "lesson": "Pontuacao que muda sentido",
        "statement": "Assinale a alternativa em que a concordancia verbal esta adequada.",
        "options": [
            "A) Fazem muitos anos que o problema existe.",
            "B) Haviam varias propostas no debate.",
            "C) Existem desafios urgentes na educacao.",
            "D) Precisa-se de voluntarios foram chamados.",
            "E) A maioria dos estudantes chegaram cedo ontem.",
        ],
        "correct_answer": "C",
        "explanation": "O verbo 'existir' concorda com o sujeito plural 'desafios urgentes'.",
        "skill": "Concordancia verbal",
        "difficulty": Difficulty.MEDIUM,
    },
    {
        "module": "Norma-padrao Essencial",
        "lesson": "Pontuacao que muda sentido",
        "statement": "Qual alternativa apresenta coesao referencial?",
        "options": [
            "A) A tecnologia mudou a escola. Ela tambem transformou a relacao com o conhecimento.",
            "B) A tecnologia mudou a escola. Portanto, entretanto, contudo.",
            "C) A tecnologia mudou a escola. Mesa, janela, horario.",
            "D) A tecnologia mudou a escola. A escola mudou a tecnologia sem relacao.",
            "E) A tecnologia mudou a escola. Porque sim.",
        ],
        "correct_answer": "A",
        "explanation": "O pronome 'Ela' retoma 'A tecnologia', evitando repeticao e mantendo continuidade textual.",
        "skill": "Coesao referencial",
        "difficulty": Difficulty.EASY,
    },
    {
        "module": "Norma-padrao Essencial",
        "lesson": "Pontuacao que muda sentido",
        "statement": "No trecho 'Estudou muito; portanto, melhorou seu desempenho', o conectivo indica:",
        "options": [
            "A) Oposicao.",
            "B) Conclusao.",
            "C) Alternancia.",
            "D) Comparacao.",
            "E) Explicacao sem causa.",
        ],
        "correct_answer": "B",
        "explanation": "'Portanto' estabelece relacao conclusiva entre o estudo e a melhora do desempenho.",
        "skill": "Coesao sequencial",
        "difficulty": Difficulty.EASY,
    },
    {
        "module": "Norma-padrao Essencial",
        "lesson": "Pontuacao que muda sentido",
        "statement": "Em 'Nao basta informar; e preciso formar leitores criticos', o ponto e virgula:",
        "options": [
            "A) Separa ideias relacionadas e reforca contraste argumentativo.",
            "B) Marca uma pergunta indireta.",
            "C) Indica fala de personagem.",
            "D) Substitui todos os acentos.",
            "E) Torna a frase informal obrigatoriamente.",
        ],
        "correct_answer": "A",
        "explanation": "O ponto e virgula aproxima duas oracoes coordenadas com relacao argumentativa clara.",
        "skill": "Pontuacao",
        "difficulty": Difficulty.HARD,
    },
    {
        "module": "Norma-padrao Essencial",
        "lesson": "Pontuacao que muda sentido",
        "statement": "A funcao conativa da linguagem aparece com mais forca quando o texto busca:",
        "options": [
            "A) Convencer ou orientar diretamente o leitor.",
            "B) Descrever apenas sentimentos do emissor.",
            "C) Explicar o codigo pelo codigo.",
            "D) Manter contato sem informar nada.",
            "E) Valorizar apenas a forma poetica.",
        ],
        "correct_answer": "A",
        "explanation": "A funcao conativa ou apelativa se concentra no interlocutor e costuma usar imperativos e chamadas para acao.",
        "skill": "Funcoes da linguagem",
        "difficulty": Difficulty.MEDIUM,
    },
    {
        "module": "Norma-padrao Essencial",
        "lesson": "Pontuacao que muda sentido",
        "statement": "Em 'A educacao, que deveria emancipar, ainda reproduz desigualdades', as virgulas isolam:",
        "options": [
            "A) Uma oracao subordinada adjetiva explicativa.",
            "B) Um sujeito simples sem complemento.",
            "C) Um vocativo obrigatorio.",
            "D) Uma enumeracao de objetos.",
            "E) Um erro de concordancia nominal.",
        ],
        "correct_answer": "A",
        "explanation": "A oracao 'que deveria emancipar' acrescenta explicacao sobre educacao e fica isolada por virgulas.",
        "skill": "Pontuacao",
        "difficulty": Difficulty.HARD,
    },
    {
        "module": "Repertorio Literario",
        "lesson": "Modernismo como repertorio",
        "statement": "A metafora ocorre quando uma palavra e usada para:",
        "options": [
            "A) Estabelecer comparacao implicita entre ideias.",
            "B) Repetir exatamente o sentido literal.",
            "C) Apagar qualquer imagem do texto.",
            "D) Corrigir a grafia de um termo.",
            "E) Indicar somente dados estatisticos.",
        ],
        "correct_answer": "A",
        "explanation": "A metafora aproxima sentidos sem usar conectivos comparativos explicitos como 'como' ou 'tal qual'.",
        "skill": "Figuras de linguagem",
        "difficulty": Difficulty.EASY,
    },
    {
        "module": "Fundamentos da Redacao",
        "lesson": "Tese forte em 3 movimentos",
        "statement": "Uma tese produtiva para a redacao ENEM deve:",
        "options": [
            "A) Apresentar uma posicao clara sobre o problema.",
            "B) Copiar integralmente a frase da proposta.",
            "C) Evitar qualquer relacao com os argumentos.",
            "D) Ser vaga para servir a qualquer tema.",
            "E) Terminar sempre com pergunta.",
        ],
        "correct_answer": "A",
        "explanation": "A tese orienta o projeto de texto e antecipa o caminho argumentativo da redacao.",
        "skill": "Redacao ENEM",
        "difficulty": Difficulty.EASY,
    },
    {
        "module": "Fundamentos da Redacao",
        "lesson": "Tese forte em 3 movimentos",
        "statement": "Qual repertorio esta mais bem articulado ao tema da democratizacao da leitura?",
        "options": [
            "A) Uma citacao sem autor e sem relacao com livros.",
            "B) A ideia de que leitura amplia participacao social e autonomia critica.",
            "C) Um dado sobre esportes sem conexao com educacao.",
            "D) Uma referencia historica usada apenas para preencher linhas.",
            "E) Um exemplo pessoal sem generalizacao possivel.",
        ],
        "correct_answer": "B",
        "explanation": "Repertorio produtivo precisa dialogar com o problema e fortalecer a argumentacao.",
        "skill": "Repertorio sociocultural",
        "difficulty": Difficulty.MEDIUM,
    },
    {
        "module": "Competencias do ENEM",
        "lesson": "Competencia 5 sem formula vazia",
        "statement": "Na proposta de intervencao, o elemento 'meio' corresponde:",
        "options": [
            "A) Ao responsavel pela execucao.",
            "B) Ao modo ou instrumento usado para realizar a acao.",
            "C) Ao problema social apresentado no tema.",
            "D) Ao repertorio citado na introducao.",
            "E) A uma conclusao sem detalhamento.",
        ],
        "correct_answer": "B",
        "explanation": "O meio indica como a acao sera executada, tornando a proposta mais concreta.",
        "skill": "Competencia 5",
        "difficulty": Difficulty.EASY,
    },
    {
        "module": "Competencias do ENEM",
        "lesson": "Competencia 5 sem formula vazia",
        "statement": "A Competencia 3 avalia principalmente:",
        "options": [
            "A) Selecao, organizacao e interpretacao de informacoes para defender um ponto de vista.",
            "B) Apenas a ortografia das palavras.",
            "C) Somente o numero de linhas escritas.",
            "D) A presenca obrigatoria de titulo.",
            "E) O uso de letras maiusculas no texto inteiro.",
        ],
        "correct_answer": "A",
        "explanation": "A Competencia 3 observa o projeto argumentativo: como informacoes e argumentos sao selecionados e articulados.",
        "skill": "Competencia 3",
        "difficulty": Difficulty.MEDIUM,
    },
    {
        "module": "Competencias do ENEM",
        "lesson": "Competencia 5 sem formula vazia",
        "statement": "Quando um paragrafo apresenta topico frasal, explicacao e exemplo, ele tende a melhorar:",
        "options": [
            "A) A progressao argumentativa e a clareza do raciocinio.",
            "B) Apenas a quantidade de linhas.",
            "C) A memorizacao de formulas prontas.",
            "D) A eliminacao da tese.",
            "E) O uso de linguagem informal.",
        ],
        "correct_answer": "A",
        "explanation": "Essa estrutura ajuda o leitor a acompanhar a ideia central, seu desenvolvimento e sua comprovacao.",
        "skill": "Argumentacao",
        "difficulty": Difficulty.MEDIUM,
    },
    {
        "module": "Fundamentos da Redacao",
        "lesson": "Como decodificar o tema",
        "statement": "Diante do tema 'Desafios para combater a evasao escolar', qual recorte e mais adequado?",
        "options": [
            "A) Falar genericamente sobre todos os problemas do Brasil.",
            "B) Discutir causas e consequencias do abandono da escola por estudantes.",
            "C) Escrever apenas sobre preferencias pessoais de estudo.",
            "D) Narrar a rotina de um professor sem relacao com evasao.",
            "E) Defender o fim da educacao formal.",
        ],
        "correct_answer": "B",
        "explanation": "O recorte adequado precisa manter foco no problema da evasao escolar e em seus fatores sociais.",
        "skill": "Compreensao do tema",
        "difficulty": Difficulty.MEDIUM,
    },
    {
        "module": "Competencias do ENEM",
        "lesson": "Competencia 5 sem formula vazia",
        "statement": "Uma conclusao nota alta no ENEM deve:",
        "options": [
            "A) Retomar o problema e apresentar proposta de intervencao viavel.",
            "B) Repetir a introducao palavra por palavra.",
            "C) Introduzir um tema novo no ultimo periodo.",
            "D) Encerrar com uma opiniao sem acao concreta.",
            "E) Usar apenas uma citacao decorada.",
        ],
        "correct_answer": "A",
        "explanation": "A conclusao deve fechar o projeto de texto e apresentar solucao articulada ao problema discutido.",
        "skill": "Redacao ENEM",
        "difficulty": Difficulty.EASY,
    },
    {
        "module": "Competencias do ENEM",
        "lesson": "Competencia 5 sem formula vazia",
        "statement": "A Competencia 4 valoriza principalmente:",
        "options": [
            "A) O uso de mecanismos linguisticos para conectar partes do texto.",
            "B) A quantidade de repertorios citados sem explicacao.",
            "C) A presenca de desenho na folha de redacao.",
            "D) A ausencia total de conectivos.",
            "E) O uso obrigatorio de linguagem coloquial.",
        ],
        "correct_answer": "A",
        "explanation": "A Competencia 4 avalia coesao e articulacao textual por pronomes, conectivos, retomadas e progressao.",
        "skill": "Competencia 4",
        "difficulty": Difficulty.MEDIUM,
    },
]


def seed_database(db: Session, *, include_demo_data: bool = True) -> None:
    user_count = db.scalar(select(func.count(User.id))) or 0
    if user_count:
        ensure_module_catalog(db)
        seed_missing_exercises(db)
        seed_missing_themes(db)
        if include_demo_data:
            seed_missing_demo_essays(db)
        db.commit()
        return

    if not include_demo_data:
        ensure_module_catalog(db)
        seed_missing_exercises(db)
        seed_missing_themes(db)
        db.commit()
        return

    student = User(
        name="Aluno Demo",
        email="aluno@demo.com",
        hashed_password=get_password_hash("12345678"),
        role=UserRole.STUDENT,
        streak_days=9,
        daily_goal_minutes=45,
    )
    admin = User(
        name="Admin Donc ENEM",
        email="admin@demo.com",
        hashed_password=get_password_hash(settings.seed_admin_password),
        role=UserRole.ADMIN,
        streak_days=18,
        daily_goal_minutes=60,
    )
    db.add_all([student, admin])
    db.flush()

    modules, lessons = ensure_module_catalog(db)

    module_by_title = {module.title: module for module in modules}
    lesson_by_title = {lesson.title: lesson for lesson in lessons}
    db.add_all(build_exercises(module_by_title, lesson_by_title))

    themes = [
        EssayTheme(
            title="Desafios para a democratizacao do acesso a educacao digital no Brasil",
            context="Considere desigualdade de acesso a internet, infraestrutura escolar, formacao docente e cidadania digital.",
            source="Donc ENEM",
        ),
        EssayTheme(
            title="Caminhos para combater a invisibilidade do trabalho de cuidado no Brasil",
            context="Reflita sobre genero, economia, politicas publicas, reconhecimento social e direitos trabalhistas.",
            source="Donc ENEM",
        ),
        EssayTheme(
            title="A importancia da leitura critica na formacao dos jovens brasileiros",
            context="Relacione escola, redes sociais, desinformacao, repertorio cultural e autonomia intelectual.",
            source="Donc ENEM",
        ),
        EssayTheme(
            title="Desafios para promover a seguranca alimentar nas cidades brasileiras",
            context="Analise renda, acesso a alimentos saudaveis, abastecimento local, educacao nutricional e politicas publicas.",
            source="Donc ENEM",
        ),
    ]
    db.add_all(themes)
    db.flush()

    sample_essay = Essay(
        user_id=student.id,
        theme_id=themes[0].id,
        title="Educacao digital e cidadania",
        content=(
            "A educacao digital tornou-se essencial para a participacao social no Brasil contemporaneo. "
            "Entretanto, a desigualdade de acesso a internet e a falta de infraestrutura nas escolas publicas "
            "limitam a aprendizagem de muitos estudantes. Alem disso, parte dos professores nao recebe formacao "
            "adequada para utilizar recursos tecnologicos de forma critica.\n\n"
            "Diante disso, e necessario compreender que a tecnologia nao resolve sozinha os problemas educacionais. "
            "Sem politicas de inclusao, ela pode aprofundar diferencas ja existentes. Portanto, o Estado deve ampliar "
            "investimentos em conectividade escolar e programas de capacitacao docente.\n\n"
            "Assim, o Ministerio da Educacao, em parceria com estados e municipios, deve criar um plano nacional de "
            "letramento digital, por meio da distribuicao de equipamentos, internet de qualidade e cursos continuados, "
            "a fim de garantir que a tecnologia seja instrumento de cidadania."
        ),
        status=EssayStatus.CORRECTED,
        word_count=154,
        line_count=9,
        paragraph_count=3,
        score=840,
    )
    db.add(sample_essay)
    db.flush()
    db.add(
        EssayCorrection(
            essay_id=sample_essay.id,
            total_score=840,
            competency_1=160,
            competency_2=200,
            competency_3=160,
            competency_4=160,
            competency_5=160,
            strengths=["Boa compreensao do tema.", "Proposta de intervencao presente e articulada."],
            errors=["Argumentacao ainda poderia trazer repertorio sociocultural mais especifico."],
            suggestions=["Aprofunde o segundo argumento com dado, autor ou exemplo historico.", "Detalhe melhor o meio de execucao da politica publica."],
            feedback="Texto consistente, com projeto claro e boa adequacao ao tema. O salto para 900+ depende de repertorio mais produtivo e maior densidade argumentativa.",
            recurrent_patterns=["repertorio pouco desenvolvido", "detalhamento da intervencao"],
        )
    )

    db.add_all(
        [
            Goal(user_id=student.id, title="Estudar redacao hoje", target=45, current=30, unit="min", due_date=date.today()),
            Goal(user_id=student.id, title="Resolver questoes de linguagem", target=12, current=7, unit="questoes", due_date=date.today()),
            LessonProgress(user_id=student.id, lesson_id=lessons[0].id, progress_percent=100, last_position_seconds=920, completed=True),
            LessonProgress(user_id=student.id, lesson_id=lessons[1].id, progress_percent=62, last_position_seconds=460, completed=False),
        ]
    )

    seed_missing_demo_essays(db)
    db.commit()


def ensure_module_catalog(db: Session) -> tuple[list[Module], list[Lesson]]:
    # Alvo de competencia (C1-C5) usado pelo gate de dominio (progression_service): define
    # em qual criterio da matriz ENEM o modulo precisa mostrar melhora antes de liberar o proximo.
    module_specs = [
        ("Fundamentos da Redacao", "fundamentos-da-redacao", "Da compreensao do tema ao projeto de texto.", "#C9A227", 1, ["c2", "c3"]),
        ("Competencias do ENEM", "competencias-do-enem", "Como a banca enxerga cada criterio da matriz.", "#65BE02", 2, ["c5"]),
        ("Norma-padrao Essencial", "norma-padrao-essencial", "Concordancia, regencia, crase e pontuacao aplicadas.", "#3B82F6", 3, ["c1"]),
        ("Leitura Estrategica", "leitura-estrategica", "Inferencia, intencionalidade e efeitos de sentido.", "#A855F7", 4, ["c2"]),
        ("Repertorio Literario", "repertorio-literario", "Autores, escolas e conexoes para argumentar melhor.", "#F97316", 5, ["c2"]),
    ]
    existing_modules = {module.title: module for module in db.scalars(select(Module))}
    modules: list[Module] = []
    for title, slug, description, color, order, target_competencies in module_specs:
        module = existing_modules.get(title)
        if not module:
            module = Module(title=title, slug=slug)
            db.add(module)
        if not module.slug:
            # Backfill de módulo criado antes do campo slug existir (ver migração
            # 0007_remove_course_entity) — sem isso ModuleRead falha na validação.
            module.slug = slug
        module.description = description
        module.color = color
        module.order = order
        module.target_competencies = target_competencies
        modules.append(module)
    db.flush()

    modules_by_title = {module.title: module for module in modules}
    lesson_specs = [
        (
            "Fundamentos da Redacao",
            "Como decodificar o tema",
            "Aprenda a encontrar recorte, palavras-chave e problema social.",
            "Identifique comando, eixo tematico, publico atingido e conflito social. O primeiro paragrafo precisa mostrar que voce entendeu o recorte, nao apenas o assunto geral.",
            1,
        ),
        (
            "Fundamentos da Redacao",
            "Tese forte em 3 movimentos",
            "Construa uma tese clara, defensavel e produtiva.",
            "Uma boa tese antecipa a linha argumentativa. Use causa, consequencia e responsabilidade social para abrir caminhos para os paragrafos seguintes.",
            2,
        ),
        (
            "Competencias do ENEM",
            "Competencia 5 sem formula vazia",
            "Monte intervencoes completas e realistas.",
            "A proposta de intervencao precisa ter agente, acao, meio, finalidade e detalhamento. Evite solucoes genericas que nao enfrentam a raiz do problema.",
            1,
        ),
        (
            "Norma-padrao Essencial",
            "Pontuacao que muda sentido",
            "Use virgulas para clareza e precisao argumentativa.",
            "Pontuacao organiza relacoes sintaticas e argumentativas. No ENEM, pontuar bem melhora fluidez e reduz ambiguidades.",
            1,
        ),
        (
            "Leitura Estrategica",
            "Inferencia em textos multimodais",
            "Leia imagem, legenda, ironia e contexto como um conjunto.",
            "Questoes ENEM raramente pedem definicao isolada. Elas avaliam relacoes entre linguagem, contexto e intencao comunicativa.",
            1,
        ),
        (
            "Repertorio Literario",
            "Modernismo como repertorio",
            "Use literatura para discutir identidade nacional e desigualdade.",
            "O Modernismo oferece repertorios para cultura brasileira, ruptura estetica e tensoes sociais. Use a referencia quando ela servir ao argumento.",
            1,
        ),
    ]
    existing_lessons = {
        (lesson.module_id, lesson.title): lesson
        for lesson in db.scalars(select(Lesson).where(Lesson.module_id.in_([module.id for module in modules])))
    }
    lessons: list[Lesson] = []
    for index, (module_title, title, description, summary, order) in enumerate(lesson_specs, start=1):
        module = modules_by_title[module_title]
        lesson = existing_lessons.get((module.id, title))
        if not lesson:
            lesson = Lesson(module_id=module.id, title=title)
            db.add(lesson)
        lesson.description = description
        lesson.thumbnail_url = f"https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1200&q=80&ixid=lesson-{index}"
        lesson.video_url = "https://www.youtube.com/embed/dQw4w9WgXcQ"
        lesson.summary = summary
        lesson.duration_minutes = 14 + index * 3
        lesson.order = order
        lessons.append(lesson)
    db.flush()

    return modules, lessons


def seed_missing_themes(db: Session) -> None:
    theme_specs = [
        {
            "title": "Desafios para a democratizacao do acesso a educacao digital no Brasil",
            "context": "Considere desigualdade de acesso a internet, infraestrutura escolar, formacao docente e cidadania digital.",
            "source": "Donc ENEM",
            "supporting_texts": [
                {
                    "title": "Texto motivador I — Exclusao digital no Brasil",
                    "content": "Segundo o IBGE, em 2022, cerca de 22% dos domicilios brasileiros ainda nao tinham acesso a internet, concentrados majoritariamente nas regioes Norte e Nordeste e em comunidades rurais. Especialistas alertam que a exclusao digital aprofunda desigualdades educacionais ja existentes, prejudicando especialmente criancas em idade escolar que dependem de conexao para acessar conteudos pedagogicos.",
                    "type": "motivador",
                },
            ],
        },
        {
            "title": "Caminhos para combater a invisibilidade do trabalho de cuidado no Brasil",
            "context": "Reflita sobre genero, economia, politicas publicas, reconhecimento social e direitos trabalhistas.",
            "source": "Donc ENEM",
            "supporting_texts": [
                {
                    "title": "Texto motivador I — Trabalho invisivel e economia",
                    "content": "O economista Guy Standing classifica o trabalho de cuidado — realizado majoritariamente por mulheres — como trabalho precario invisivel ao sistema economico formal. No Brasil, pesquisas do IPEA indicam que mulheres dedicam, em media, o dobro do tempo dos homens a atividades domesticas e de cuidado nao remuneradas, o que impacta diretamente sua participacao no mercado de trabalho e na vida publica.",
                    "type": "motivador",
                },
            ],
        },
        {
            "title": "A importancia da leitura critica na formacao dos jovens brasileiros",
            "context": "Relacione escola, redes sociais, desinformacao, repertorio cultural e autonomia intelectual.",
            "source": "Donc ENEM",
            "supporting_texts": [
                {
                    "title": "Texto motivador I — Jovens e desinformacao",
                    "content": "Um relatorio do Reuters Institute (2023) indica que 62% dos jovens entre 18 e 24 anos acessam noticias principalmente por redes sociais, ambiente em que algoritmos priorizam engajamento em detrimento de veracidade. Especialistas alertam que a ausencia de letramento midiatico critico alimenta a circulacao de desinformacao e dificulta a formacao de cidadaos capazes de tomar decisoes autonomas.",
                    "type": "motivador",
                },
            ],
        },
        {
            "title": "Desafios para promover a seguranca alimentar nas cidades brasileiras",
            "context": "Analise renda, acesso a alimentos saudaveis, abastecimento local, educacao nutricional e politicas publicas.",
            "source": "Donc ENEM",
            "supporting_texts": [
                {
                    "title": "Texto motivador I — Acesso desigual a alimentos saudaveis",
                    "content": "A seguranca alimentar envolve disponibilidade, renda, qualidade nutricional e regularidade de acesso. Em grandes cidades, familias vulneraveis podem viver longe de feiras, mercados populares e equipamentos publicos de abastecimento, o que limita escolhas alimentares e amplia a dependencia de produtos baratos e pouco nutritivos.",
                    "type": "motivador",
                },
            ],
        },
    ]
    for spec in theme_specs:
        existing = db.scalar(select(EssayTheme).where(EssayTheme.title == spec["title"]))
        if not existing:
            db.add(EssayTheme(**spec))
        elif not existing.supporting_texts:
            existing.supporting_texts = spec["supporting_texts"]


def seed_missing_demo_essays(db: Session) -> None:
    student = db.scalar(select(User).where(User.email == "aluno@demo.com"))
    if not student:
        return

    themes = {theme.title: theme for theme in db.scalars(select(EssayTheme))}
    if not themes:
        return

    existing_titles = set(db.scalars(select(Essay.title).where(Essay.user_id == student.id)))
    now = datetime.now(UTC)
    specs = [
        {
            "theme": "Desafios para a democratizacao do acesso a educacao digital no Brasil",
            "title": "Educacao digital e cidadania V2",
            "status": EssayStatus.CORRECTED,
            "days": 5,
            "score": 900,
            "competencies": (180, 200, 180, 180, 160),
            "patterns": ["detalhamento da intervencao", "repertorio em amadurecimento"],
            "feedback": "A segunda versao aprofunda o repertorio e sustenta melhor a progressao argumentativa. A intervencao ainda pode detalhar melhor o monitoramento da politica publica.",
            "content": (
                "A democratizacao do acesso a educacao digital e uma exigencia para a cidadania no Brasil. "
                "Embora ferramentas tecnologicas ampliem possibilidades de aprendizagem, a desigualdade de infraestrutura ainda impede que parte dos estudantes participe plenamente desse processo. "
                "Nesse sentido, a exclusao digital nao e apenas um problema tecnico, mas tambem social, pois limita acesso a informacao, autonomia e qualificacao profissional.\n\n"
                "Alem disso, a escola publica muitas vezes recebe equipamentos sem formacao docente continuada. Assim, mesmo quando ha internet, faltam planejamento pedagogico e leitura critica das plataformas. "
                "Tal quadro mostra que inclusao digital depende de politica publica integrada, com rede, materiais, formacao e acompanhamento.\n\n"
                "Portanto, o Ministerio da Educacao deve implementar um programa nacional de letramento digital, por meio de financiamento para conectividade, capacitacao docente e avaliacao anual das escolas, "
                "a fim de reduzir desigualdades e garantir que a tecnologia seja instrumento efetivo de aprendizagem."
            ),
        },
        {
            "theme": "Caminhos para combater a invisibilidade do trabalho de cuidado no Brasil",
            "title": "Trabalho de cuidado e reconhecimento V1",
            "status": EssayStatus.CORRECTED,
            "days": 13,
            "score": 760,
            "competencies": (160, 160, 140, 160, 140),
            "patterns": ["argumento pouco desenvolvido", "proposta generica"],
            "feedback": "O texto compreende o problema, mas precisa selecionar melhor dados e exemplos. A proposta aparece, porem ainda depende de agente, meio e detalhamento mais precisos.",
            "content": (
                "No Brasil, o trabalho de cuidado permanece pouco valorizado, apesar de sustentar a rotina de criancas, idosos e pessoas com deficiencia. "
                "Essa invisibilidade atinge principalmente mulheres, que acumulam tarefas domesticas e responsabilidades familiares sem reconhecimento economico adequado. "
                "Como consequencia, muitas deixam o mercado de trabalho formal ou aceitam ocupacoes com baixa remuneracao.\n\n"
                "O problema tambem revela uma falha cultural, pois a sociedade tende a tratar o cuidado como obrigacao natural feminina. "
                "Essa visao impede a criacao de politicas publicas mais amplas e reforca desigualdades de genero. Desse modo, e necessario reconhecer que cuidar tambem e trabalho e produz valor social.\n\n"
                "Assim, o governo deve criar campanhas de conscientizacao e ampliar servicos publicos de cuidado, com creches e centros de apoio, para dividir responsabilidades e garantir dignidade a quem cuida."
            ),
        },
        {
            "theme": "A importancia da leitura critica na formacao dos jovens brasileiros",
            "title": "Leitura critica e autonomia V1",
            "status": EssayStatus.CORRECTED,
            "days": 21,
            "score": 680,
            "competencies": (140, 160, 120, 140, 120),
            "patterns": ["tese pouco explicita", "coesao limitada", "repertorio pouco desenvolvido"],
            "feedback": "Ha entendimento do tema, mas a tese precisa ficar mais explicita. Os paragrafos ainda listam ideias sem hierarquia argumentativa suficiente.",
            "content": (
                "A leitura critica e importante para a formacao dos jovens brasileiros porque permite interpretar informacoes de modo mais consciente. "
                "Em uma sociedade marcada por redes sociais e circulacao rapida de noticias, muitos estudantes entram em contato com textos sem avaliar fonte, contexto e intencao. "
                "Isso pode favorecer desinformacao e reduzir a autonomia intelectual.\n\n"
                "A escola possui papel central nesse processo, pois deve ensinar o aluno a comparar argumentos, identificar manipulacoes e relacionar repertorios. "
                "No entanto, parte das praticas escolares ainda se concentra na memorizacao, o que limita a construcao de leitores ativos.\n\n"
                "Portanto, escolas e secretarias de educacao devem ampliar projetos de leitura orientada, debates e analise de midias, para desenvolver jovens capazes de ler, questionar e participar melhor da vida publica."
            ),
        },
        {
            "theme": "A importancia da leitura critica na formacao dos jovens brasileiros",
            "title": "Leitura critica e autonomia V2",
            "status": EssayStatus.DRAFT,
            "days": 1,
            "score": None,
            "competencies": None,
            "patterns": [],
            "feedback": "",
            "content": (
                "A leitura critica deve ser compreendida como uma competencia de cidadania. Em um ambiente digital no qual opinioes, noticias e publicidade circulam de modo acelerado, "
                "o jovem precisa aprender a identificar interesses, verificar fontes e comparar argumentos. Sem essa formacao, a escola corre o risco de preparar estudantes apenas para repetir informacoes, "
                "e nao para interpretar o mundo de forma autonoma.\n\n"
                "Nesse contexto, pretendo desenvolver um segundo argumento sobre o papel das redes sociais e finalizar com uma proposta voltada a projetos interdisciplinares de leitura."
            ),
        },
        {
            "theme": "Caminhos para combater a invisibilidade do trabalho de cuidado no Brasil",
            "title": "Reconhecimento do cuidado - rascunho",
            "status": EssayStatus.DRAFT,
            "days": 0,
            "score": None,
            "competencies": None,
            "patterns": [],
            "feedback": "",
            "content": (
                "A invisibilidade do trabalho de cuidado revela uma contradicao social: atividades indispensaveis para a manutencao da vida sao tratadas como secundarias. "
                "Esse apagamento afeta especialmente mulheres e familias de baixa renda. O texto ainda precisa de um repertorio mais forte e de uma proposta com agente publico definido."
            ),
        },
    ]

    new_essays: list[Essay] = []
    for spec in specs:
        if spec["title"] in existing_titles:
            continue
        theme = themes.get(str(spec["theme"]))
        if not theme:
            continue
        content = str(spec["content"])
        created_at = now - timedelta(days=int(spec["days"]))
        essay = Essay(
            user_id=student.id,
            theme_id=theme.id,
            title=str(spec["title"]),
            content=content,
            status=spec["status"],
            word_count=len(content.split()),
            line_count=max(1, len([line for line in content.splitlines() if line.strip()]), len(content) // 92),
            paragraph_count=_paragraph_count(content),
            score=spec["score"],
            created_at=created_at,
            updated_at=created_at,
            submitted_at=created_at if spec["status"] == EssayStatus.CORRECTED else None,
        )
        db.add(essay)
        db.flush()
        if spec["status"] == EssayStatus.CORRECTED and spec["competencies"]:
            c1, c2, c3, c4, c5 = spec["competencies"]
            db.add(
                EssayCorrection(
                    essay_id=essay.id,
                    total_score=int(spec["score"]),
                    competency_1=c1,
                    competency_2=c2,
                    competency_3=c3,
                    competency_4=c4,
                    competency_5=c5,
                    strengths=["Recorte tematico compreensivel.", "Projeto de texto em evolucao."],
                    errors=["Aprofundar repertorio e detalhamento quando necessario."],
                    suggestions=["Revisar a hierarquia dos argumentos.", "Conectar melhor repertorio e tese.", "Detalhar agente, meio e finalidade na intervencao."],
                    feedback=str(spec["feedback"]),
                    recurrent_patterns=list(spec["patterns"]),
                    created_at=created_at,
                )
            )
        new_essays.append(essay)

    if new_essays:
        db.commit()


def _paragraph_count(content: str) -> int:
    stripped = content.strip()
    if not stripped:
        return 0
    if "\n\n" in stripped:
        return len([paragraph for paragraph in stripped.split("\n\n") if paragraph.strip()])
    return len([line for line in stripped.splitlines() if line.strip()])


def seed_missing_exercises(db: Session) -> None:
    modules = list(db.scalars(select(Module)))
    module_ids = [module.id for module in modules]
    if not module_ids:
        return

    module_by_title = {module.title: module for module in modules}
    lesson_by_title = {lesson.title: lesson for lesson in db.scalars(select(Lesson).where(Lesson.module_id.in_(module_ids)))}
    existing_exercises = {tuple(row) for row in db.execute(select(Exercise.module_id, Exercise.statement))}
    exercises = build_exercises(module_by_title, lesson_by_title, existing_exercises)
    if exercises:
        db.add_all(exercises)
        db.commit()


def build_exercises(
    module_by_title: dict[str, Module],
    lesson_by_title: dict[str, Lesson],
    existing_exercises: set[tuple[int, str]] | None = None,
) -> list[Exercise]:
    existing = existing_exercises or set()
    exercises: list[Exercise] = []

    for spec in EXERCISE_SPECS:
        statement = str(spec["statement"])
        module = module_by_title.get(str(spec["module"]))
        lesson = lesson_by_title.get(str(spec["lesson"]))
        if not module or (module.id, statement) in existing:
            continue

        exercises.append(
            Exercise(
                module_id=module.id,
                lesson_id=lesson.id if lesson else None,
                statement=statement,
                options=list(spec["options"]),
                correct_answer=str(spec["correct_answer"]),
                explanation=str(spec["explanation"]),
                skill=str(spec["skill"]),
                difficulty=spec["difficulty"],
            )
        )

    return exercises
