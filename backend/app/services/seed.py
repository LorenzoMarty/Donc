from datetime import UTC, date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models import (
    Achievement,
    Course,
    Difficulty,
    Essay,
    EssayCorrection,
    EssayStatus,
    EssayTheme,
    Exercise,
    Goal,
    Lesson,
    LessonProgress,
    MockExam,
    MockExamQuestion,
    Module,
    User,
    UserAchievement,
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
        ensure_course_catalog(db)
        seed_missing_exercises(db)
        seed_missing_themes(db)
        seed_missing_mock_exam(db)
        seed_missing_achievements(db)
        if include_demo_data:
            seed_missing_demo_essays(db)
        db.commit()
        return

    if not include_demo_data:
        ensure_course_catalog(db)
        seed_missing_exercises(db)
        seed_missing_themes(db)
        seed_missing_mock_exam(db)
        seed_missing_achievements(db)
        db.commit()
        return

    student = User(
        name="Aluno Demo",
        email="aluno@demo.com",
        hashed_password=get_password_hash("12345678"),
        role=UserRole.STUDENT,
        xp=680,
        level=3,
        streak_days=9,
        daily_goal_minutes=45,
    )
    admin = User(
        name="Admin Donk ENEM",
        email="admin@demo.com",
        hashed_password=get_password_hash("12345678"),
        role=UserRole.ADMIN,
        xp=1200,
        level=5,
        streak_days=18,
        daily_goal_minutes=60,
    )
    db.add_all([student, admin])
    db.flush()

    _, modules, lessons = ensure_course_catalog(db)

    module_by_title = {module.title: module for module in modules}
    lesson_by_title = {lesson.title: lesson for lesson in lessons}
    db.add_all(build_exercises(module_by_title, lesson_by_title))

    themes = [
        EssayTheme(
            title="Desafios para a democratizacao do acesso a educacao digital no Brasil",
            context="Considere desigualdade de acesso a internet, infraestrutura escolar, formacao docente e cidadania digital.",
            source="Donk ENEM",
        ),
        EssayTheme(
            title="Caminhos para combater a invisibilidade do trabalho de cuidado no Brasil",
            context="Reflita sobre genero, economia, politicas publicas, reconhecimento social e direitos trabalhistas.",
            source="Donk ENEM",
        ),
        EssayTheme(
            title="A importancia da leitura critica na formacao dos jovens brasileiros",
            context="Relacione escola, redes sociais, desinformacao, repertorio cultural e autonomia intelectual.",
            source="Donk ENEM",
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

    exam = MockExam(title="Simulado ENEM Linguagens I", description="Bloco curto para treino de interpretacao, gramatica e redacao.", duration_minutes=45)
    db.add(exam)
    db.flush()
    db.add_all(
        [
            MockExamQuestion(
                exam_id=exam.id,
                statement="Em textos publicitarios, o uso do imperativo geralmente busca:",
                options=["A) Narrar eventos passados.", "B) Convocar o leitor a uma acao.", "C) Apagar a intencao persuasiva.", "D) Descrever apenas paisagens.", "E) Eliminar marcas de interlocucao."],
                correct_answer="B",
                explanation="O imperativo aproxima o interlocutor e reforca a chamada para acao.",
                skill="Funcoes da linguagem",
            ),
            MockExamQuestion(
                exam_id=exam.id,
                statement="A coesao referencial ocorre quando um termo:",
                options=["A) Retoma ou antecipa outro elemento textual.", "B) Contradiz a tese obrigatoriamente.", "C) Substitui a pontuacao.", "D) Remove conectivos.", "E) Impede inferencias."],
                correct_answer="A",
                explanation="Pronomes, sinonimos e expressoes equivalentes podem retomar informacoes e evitar repeticao.",
                skill="Coesao",
            ),
            MockExamQuestion(
                exam_id=exam.id,
                statement="Uma tese produtiva para redacao deve:",
                options=["A) Ser vaga para servir a qualquer tema.", "B) Apresentar posicao clara sobre o problema.", "C) Evitar relacao com os argumentos.", "D) Copiar integralmente a proposta.", "E) Ser sempre uma pergunta."],
                correct_answer="B",
                explanation="A tese orienta o projeto de texto e precisa deixar evidente o posicionamento do autor.",
                skill="Redacao ENEM",
            ),
        ]
    )

    achievements = [
        Achievement(code="first_essay", title="Primeira Redacao", description="Enviou a primeira redacao para correcao.", icon="pen-line", xp_reward=100),
        Achievement(code="streak_7", title="Sequencia 7 dias", description="Manteve uma rotina de estudo por sete dias.", icon="flame", xp_reward=120),
        Achievement(code="grammar_focus", title="Precisao Gramatical", description="Concluiu uma trilha de norma-padrao.", icon="badge-check", xp_reward=80),
    ]
    db.add_all(achievements)
    db.flush()
    db.add_all(
        [
            UserAchievement(user_id=student.id, achievement_id=achievements[0].id),
            UserAchievement(user_id=student.id, achievement_id=achievements[1].id),
            Goal(user_id=student.id, title="Estudar redacao hoje", target=45, current=30, unit="min", due_date=date.today()),
            Goal(user_id=student.id, title="Resolver questoes de linguagem", target=12, current=7, unit="questoes", due_date=date.today()),
            LessonProgress(user_id=student.id, lesson_id=lessons[0].id, progress_percent=100, last_position_seconds=920, completed=True),
            LessonProgress(user_id=student.id, lesson_id=lessons[1].id, progress_percent=62, last_position_seconds=460, completed=False),
        ]
    )

    seed_missing_demo_essays(db)
    db.commit()


def ensure_course_catalog(db: Session) -> tuple[Course, list[Module], list[Lesson]]:
    course = db.scalar(select(Course).where(Course.slug == "destrave-redacao"))
    if not course:
        course = Course(slug="destrave-redacao")
        db.add(course)

    course.title = "Destrave a redação"
    course.description = "Curso inicial para sair do bloqueio e montar uma redação ENEM com tema, tese, argumentos, coesão e intervenção."
    course.color = "#C9A227"
    db.flush()

    module_specs = [
        ("Fundamentos da Redacao", "Da compreensao do tema ao projeto de texto.", 1),
        ("Competencias do ENEM", "Como a banca enxerga cada criterio da matriz.", 2),
        ("Norma-padrao Essencial", "Concordancia, regencia, crase e pontuacao aplicadas.", 3),
        ("Leitura Estrategica", "Inferencia, intencionalidade e efeitos de sentido.", 4),
        ("Repertorio Literario", "Autores, escolas e conexoes para argumentar melhor.", 5),
    ]
    existing_modules = {
        module.title: module
        for module in db.scalars(select(Module).where(Module.course_id == course.id))
    }
    modules: list[Module] = []
    for title, description, order in module_specs:
        module = existing_modules.get(title)
        if not module:
            module = Module(course_id=course.id, title=title)
            db.add(module)
        module.description = description
        module.order = order
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

    return course, modules, lessons


def seed_missing_themes(db: Session) -> None:
    theme_specs = [
        (
            "Desafios para a democratizacao do acesso a educacao digital no Brasil",
            "Considere desigualdade de acesso a internet, infraestrutura escolar, formacao docente e cidadania digital.",
            "Donk ENEM",
        ),
        (
            "Caminhos para combater a invisibilidade do trabalho de cuidado no Brasil",
            "Reflita sobre genero, economia, politicas publicas, reconhecimento social e direitos trabalhistas.",
            "Donk ENEM",
        ),
        (
            "A importancia da leitura critica na formacao dos jovens brasileiros",
            "Relacione escola, redes sociais, desinformacao, repertorio cultural e autonomia intelectual.",
            "Donk ENEM",
        ),
    ]
    existing_titles = set(db.scalars(select(EssayTheme.title)))
    for title, context, source in theme_specs:
        if title not in existing_titles:
            db.add(EssayTheme(title=title, context=context, source=source))


def seed_missing_mock_exam(db: Session) -> None:
    title = "Simulado ENEM Linguagens I"
    if db.scalar(select(MockExam).where(MockExam.title == title)):
        return

    exam = MockExam(title=title, description="Bloco curto para treino de interpretacao, gramatica e redacao.", duration_minutes=45)
    db.add(exam)
    db.flush()
    db.add_all(
        [
            MockExamQuestion(
                exam_id=exam.id,
                statement="Em textos publicitarios, o uso do imperativo geralmente busca:",
                options=["A) Narrar eventos passados.", "B) Convocar o leitor a uma acao.", "C) Apagar a intencao persuasiva.", "D) Descrever apenas paisagens.", "E) Eliminar marcas de interlocucao."],
                correct_answer="B",
                explanation="O imperativo aproxima o interlocutor e reforca a chamada para acao.",
                skill="Funcoes da linguagem",
            ),
            MockExamQuestion(
                exam_id=exam.id,
                statement="A coesao referencial ocorre quando um termo:",
                options=["A) Retoma ou antecipa outro elemento textual.", "B) Contradiz a tese obrigatoriamente.", "C) Substitui a pontuacao.", "D) Remove conectivos.", "E) Impede inferencias."],
                correct_answer="A",
                explanation="Pronomes, sinonimos e expressoes equivalentes podem retomar informacoes e evitar repeticao.",
                skill="Coesao",
            ),
            MockExamQuestion(
                exam_id=exam.id,
                statement="Uma tese produtiva para redacao deve:",
                options=["A) Ser vaga para servir a qualquer tema.", "B) Apresentar posicao clara sobre o problema.", "C) Evitar relacao com os argumentos.", "D) Copiar integralmente a proposta.", "E) Ser sempre uma pergunta."],
                correct_answer="B",
                explanation="A tese orienta o projeto de texto e precisa deixar evidente o posicionamento do autor.",
                skill="Redacao ENEM",
            ),
        ]
    )


def seed_missing_achievements(db: Session) -> None:
    specs = [
        ("first_essay", "Primeira Redacao", "Enviou a primeira redacao para correcao.", "pen-line", 100),
        ("streak_7", "Sequencia 7 dias", "Manteve uma rotina de estudo por sete dias.", "flame", 120),
        ("grammar_focus", "Precisao Gramatical", "Concluiu uma trilha de norma-padrao.", "badge-check", 80),
    ]
    existing_codes = set(db.scalars(select(Achievement.code)))
    for code, title, description, icon, xp_reward in specs:
        if code not in existing_codes:
            db.add(Achievement(code=code, title=title, description=description, icon=icon, xp_reward=xp_reward))


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


def seed_missing_exercises(db: Session) -> None:
    course = db.scalar(select(Course).where(Course.slug == "destrave-redacao"))
    if not course:
        return

    modules = list(db.scalars(select(Module).where(Module.course_id == course.id)))
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
