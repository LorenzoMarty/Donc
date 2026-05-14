from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models import (
    Achievement,
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
    Subject,
    User,
    UserAchievement,
    UserRole,
)


def seed_database(db: Session) -> None:
    user_count = db.scalar(select(func.count(User.id))) or 0
    if user_count:
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
        name="Admin Lume",
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

    subjects = [
        Subject(
            title="Redacao ENEM",
            slug="redacao-enem",
            description="Metodo completo para tese, argumentacao, repertorio e intervencao nota 1000.",
            color="#C9A227",
        ),
        Subject(
            title="Gramatica",
            slug="gramatica",
            description="Norma-padrao aplicada a questoes e redacoes, sem decoreba improdutiva.",
            color="#0F4C5C",
        ),
        Subject(
            title="Interpretacao",
            slug="interpretacao",
            description="Leitura de textos verbais, nao verbais, generos e estrategias ENEM.",
            color="#2F4858",
        ),
        Subject(
            title="Literatura",
            slug="literatura",
            description="Movimentos literarios, repertorios e relacao com linguagem contemporanea.",
            color="#8A6F2A",
        ),
    ]
    db.add_all(subjects)
    db.flush()

    module_specs = [
        (subjects[0], "Fundamentos da Redacao", "Da compreensao do tema ao projeto de texto.", 1),
        (subjects[0], "Competencias do ENEM", "Como a banca enxerga cada criterio da matriz.", 2),
        (subjects[1], "Norma-padrao Essencial", "Concordancia, regencia, crase e pontuacao aplicadas.", 1),
        (subjects[2], "Leitura Estrategica", "Inferencia, intencionalidade e efeitos de sentido.", 1),
        (subjects[3], "Repertorio Literario", "Autores, escolas e conexoes para argumentar melhor.", 1),
    ]
    modules = [Module(subject_id=subject.id, title=title, description=description, order=order) for subject, title, description, order in module_specs]
    db.add_all(modules)
    db.flush()

    lesson_specs = [
        (
            modules[0],
            "Como decodificar o tema",
            "Aprenda a encontrar recorte, palavras-chave e problema social.",
            "Identifique comando, eixo tematico, publico atingido e conflito social. O primeiro paragrafo precisa mostrar que voce entendeu o recorte, nao apenas o assunto geral.",
            1,
        ),
        (
            modules[0],
            "Tese forte em 3 movimentos",
            "Construa uma tese clara, defensavel e produtiva.",
            "Uma boa tese antecipa a linha argumentativa. Use causa, consequencia e responsabilidade social para abrir caminhos para os paragrafos seguintes.",
            2,
        ),
        (
            modules[1],
            "Competencia 5 sem formula vazia",
            "Monte intervencoes completas e realistas.",
            "A proposta de intervencao precisa ter agente, acao, meio, finalidade e detalhamento. Evite solucoes genericas que nao enfrentam a raiz do problema.",
            1,
        ),
        (
            modules[2],
            "Pontuacao que muda sentido",
            "Use virgulas para clareza e precisao argumentativa.",
            "Pontuacao organiza relacoes sintaticas e argumentativas. No ENEM, pontuar bem melhora fluidez e reduz ambiguidades.",
            1,
        ),
        (
            modules[3],
            "Inferencia em textos multimodais",
            "Leia imagem, legenda, ironia e contexto como um conjunto.",
            "Questoes ENEM raramente pedem definicao isolada. Elas avaliam relacoes entre linguagem, contexto e intencao comunicativa.",
            1,
        ),
        (
            modules[4],
            "Modernismo como repertorio",
            "Use literatura para discutir identidade nacional e desigualdade.",
            "O Modernismo oferece repertorios para cultura brasileira, ruptura estetica e tensoes sociais. Use a referencia quando ela servir ao argumento.",
            1,
        ),
    ]
    lessons: list[Lesson] = []
    for index, (module, title, description, summary, order) in enumerate(lesson_specs, start=1):
        lessons.append(
            Lesson(
                module_id=module.id,
                title=title,
                description=description,
                thumbnail_url=f"https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1200&q=80&ixid=lesson-{index}",
                video_url="https://www.youtube.com/embed/dQw4w9WgXcQ",
                summary=summary,
                duration_minutes=14 + index * 3,
                order=order,
            )
        )
    db.add_all(lessons)
    db.flush()

    exercises = [
        Exercise(
            module_id=modules[0].id,
            lesson_id=lessons[0].id,
            statement="Em uma proposta sobre invisibilidade do trabalho de cuidado, qual alternativa melhor identifica o recorte tematico?",
            options=[
                "A) Qualquer atividade profissional feminina.",
                "B) A falta de reconhecimento social e economico de atividades de cuidado.",
                "C) A defesa de que todo trabalho deve ser voluntario.",
                "D) A historia do mercado financeiro brasileiro.",
                "E) O fim das relacoes familiares contemporaneas.",
            ],
            correct_answer="B",
            explanation="O recorte combina invisibilidade, cuidado e reconhecimento social/economico, nao apenas trabalho feminino de forma ampla.",
            skill="Compreensao do tema",
            difficulty=Difficulty.MEDIUM,
        ),
        Exercise(
            module_id=modules[1].id,
            lesson_id=lessons[2].id,
            statement="Qual item completa melhor uma proposta de intervencao ENEM?",
            options=[
                "A) Apenas citar o governo.",
                "B) Apresentar agente, acao, meio, finalidade e detalhamento.",
                "C) Encerrar com uma pergunta retorica.",
                "D) Repetir a tese da introducao.",
                "E) Usar um repertorio historico sem relacao com a solucao.",
            ],
            correct_answer="B",
            explanation="A Competencia 5 exige uma proposta detalhada, articulada ao problema e respeitosa aos direitos humanos.",
            skill="Competencia 5",
            difficulty=Difficulty.EASY,
        ),
        Exercise(
            module_id=modules[2].id,
            lesson_id=lessons[3].id,
            statement="Assinale a frase em que a virgula evita ambiguidade.",
            options=[
                "A) Os alunos que estudaram passaram.",
                "B) Ao chegar em casa, revisei a redacao.",
                "C) A sociedade brasileira enfrenta desafios.",
                "D) A proposta precisa de detalhamento.",
                "E) O texto apresenta tese clara.",
            ],
            correct_answer="B",
            explanation="A virgula separa a oracao deslocada e facilita a leitura da relacao temporal.",
            skill="Pontuacao",
            difficulty=Difficulty.MEDIUM,
        ),
        Exercise(
            module_id=modules[3].id,
            lesson_id=lessons[4].id,
            statement="Em charges, a critica social costuma surgir principalmente da relacao entre:",
            options=[
                "A) Titulo, linguagem visual e contexto.",
                "B) Numero de linhas e tamanho da fonte.",
                "C) Apenas a biografia do autor.",
                "D) Regras de acentuacao.",
                "E) Ordem alfabetica das palavras.",
            ],
            correct_answer="A",
            explanation="Textos multimodais exigem leitura integrada entre elementos verbais, visuais e contexto sociocultural.",
            skill="Textos multimodais",
            difficulty=Difficulty.MEDIUM,
        ),
    ]
    db.add_all(exercises)

    themes = [
        EssayTheme(
            title="Desafios para a democratizacao do acesso a educacao digital no Brasil",
            context="Considere desigualdade de acesso a internet, infraestrutura escolar, formacao docente e cidadania digital.",
            source="Lume ENEM",
        ),
        EssayTheme(
            title="Caminhos para combater a invisibilidade do trabalho de cuidado no Brasil",
            context="Reflita sobre genero, economia, politicas publicas, reconhecimento social e direitos trabalhistas.",
            source="Lume ENEM",
        ),
        EssayTheme(
            title="A importancia da leitura critica na formacao dos jovens brasileiros",
            context="Relacione escola, redes sociais, desinformacao, repertorio cultural e autonomia intelectual.",
            source="Lume ENEM",
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

    db.commit()

