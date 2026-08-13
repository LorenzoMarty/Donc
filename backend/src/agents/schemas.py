from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


DifficultyLevel = Literal["easy", "medium", "hard"]


class ThesisAnalysis(BaseModel):
    thesis_present: bool
    thesis: str
    clarity_score: int = Field(ge=0, le=100)
    argument_strength: int = Field(ge=0, le=100)
    issues: list[str] = Field(default_factory=list)
    improvements: list[str] = Field(default_factory=list)


class GrammarAnalysis(BaseModel):
    grammar_score: int = Field(ge=0, le=100)
    cohesion_score: int = Field(ge=0, le=100)
    formality_score: int = Field(ge=0, le=100)
    repeated_terms: list[str] = Field(default_factory=list)
    mistakes: list[str] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)


class RepertoireAnalysis(BaseModel):
    repertoire_score: int = Field(ge=0, le=100)
    repertories_found: list[str] = Field(default_factory=list)
    weak_connections: list[str] = Field(default_factory=list)
    suggested_repertories: list[str] = Field(default_factory=list)
    sociocultural_links: list[str] = Field(default_factory=list)


class ENEMCompetencyAnalysis(BaseModel):
    c1: int = Field(ge=0, le=200, description="Competencia I: dominio da modalidade escrita formal.")
    c2: int = Field(ge=0, le=200, description="Competencia II: compreensao do tema e genero dissertativo-argumentativo.")
    c3: int = Field(ge=0, le=200, description="Competencia III: organizacao de argumentos em defesa de ponto de vista.")
    c4: int = Field(ge=0, le=200, description="Competencia IV: mecanismos linguisticos de coesao e argumentacao.")
    c5: int = Field(ge=0, le=200, description="Competencia V: proposta de intervencao completa e respeitosa aos direitos humanos.")
    justifications: dict[str, str] = Field(default_factory=dict, description="Justificativas curtas por chave c1, c2, c3, c4 e c5.")
    pedagogical_feedback: list[str] = Field(default_factory=list, description="Orientacoes praticas para elevar as competencias mais fracas.")
    weak_competencies: list[str] = Field(default_factory=list, description="Competencias abaixo de 160, usando chaves c1, c2, c3, c4 e c5.")


class InlineAnnotation(BaseModel):
    paragraph_index: int = Field(ge=0, description="Indice do paragrafo (base 0).")
    quote: str = Field(min_length=4, description="Trecho exato do texto do aluno.")
    comment: str = Field(min_length=10, description="Explicacao pedagogica do desconto ou acerto.")
    competency: str = Field(description="Competencia relacionada: c1, c2, c3, c4 ou c5.")
    type: Literal["error", "strength"] = Field(description="Tipo: erro ou ponto positivo.")


class EssayCorrectionResult(BaseModel):
    total_score: int = Field(ge=0, le=1000, description="Soma exata das cinco competencias.")
    competency_1: int = Field(ge=0, le=200, description="Nota da Competencia I.")
    competency_2: int = Field(ge=0, le=200, description="Nota da Competencia II.")
    competency_3: int = Field(ge=0, le=200, description="Nota da Competencia III.")
    competency_4: int = Field(ge=0, le=200, description="Nota da Competencia IV.")
    competency_5: int = Field(ge=0, le=200, description="Nota da Competencia V.")
    strengths: list[str] = Field(min_length=1, description="Acertos concretos ligados a competencias.")
    errors: list[str] = Field(min_length=1, description="Problemas que derrubam nota, com criterio ENEM claro.")
    suggestions: list[str] = Field(min_length=1, description="Acoes de reescrita ou treino conectadas aos erros.")
    feedback: str = Field(min_length=20, description="Sintese pedagogica objetiva com proximo foco de melhoria.")
    recurrent_patterns: list[str] = Field(default_factory=list, description="Padroes recorrentes para memoria e plano de estudos.")
    inline_annotations: list[InlineAnnotation] = Field(default_factory=list, description="Anotacoes inline sobre trechos especificos da redacao.")


class GeneratedQuizQuestion(BaseModel):
    statement: str = Field(min_length=20, max_length=900)
    options: list[str] = Field(min_length=5, max_length=5)
    correct_answer: Literal["A", "B", "C", "D", "E"]
    explanation: str = Field(min_length=20)
    skill: str = Field(min_length=3)
    difficulty: DifficultyLevel


class ExerciseGenerationResult(BaseModel):
    focus: str
    difficulty: DifficultyLevel
    questions: list[GeneratedQuizQuestion] = Field(min_length=1)
    adaptation_reason: str


SupportingTextType = Literal[
    "motivador",
    "dados",
    "repertorio",
    "imagem",
    "grafico",
    "infografico",
    "postagem",
    "manchete",
    "tirinha",
    "charge",
]


class ChartPoint(BaseModel):
    label: str = Field(min_length=1, max_length=60)
    value: float


class GeneratedSupportingText(BaseModel):
    title: str = Field(min_length=4, max_length=120)
    content: str = Field(min_length=20, max_length=900)
    type: SupportingTextType = "motivador"
    chart_points: list[ChartPoint] | None = Field(default=None, description="Pontos do grafico (tipo grafico).")
    stat_items: list[ChartPoint] | None = Field(default=None, description="Itens do infografico (tipo infografico).")
    comic_panels: list[str] | None = Field(default=None, description="Falas/quadros da tirinha (tipo tirinha).")
    post_author: str | None = Field(default=None, max_length=80, description="Autor da postagem (tipo postagem).")
    post_handle: str | None = Field(default=None, max_length=40, description="Usuario/handle da postagem (tipo postagem).")
    headline_subtitle: str | None = Field(default=None, max_length=220, description="Linha fina da manchete (tipo manchete).")
    headline_source: str | None = Field(default=None, max_length=80, description="Veiculo/fonte da manchete (tipo manchete).")
    image_prompt: str | None = Field(
        default=None, max_length=500, description="Descricao visual para gerar a imagem (tipo charge/tirinha)."
    )
    image_url: str | None = Field(
        default=None, description="Preenchido apos geracao da imagem; nunca gerado pelo LLM de texto."
    )


class EssayThemeGenerationResult(BaseModel):
    title: str = Field(min_length=20, max_length=220)
    context: str = Field(min_length=120, max_length=1800)
    supporting_texts: list[GeneratedSupportingText] = Field(min_length=1, max_length=8)
    rationale: str = Field(min_length=20, max_length=500)


class EssayThemeBatchGenerationResult(BaseModel):
    themes: list[EssayThemeGenerationResult] = Field(min_length=1, max_length=4)


class GameQuestion(BaseModel):
    prompt: str = Field(min_length=15, max_length=600, description="Enunciado da questao, pode incluir lacuna _ ou contexto.")
    options: list[str] = Field(min_length=4, max_length=4, description="Exatamente 4 opcoes de resposta, sem prefixo de letra.")
    answer_index: int = Field(ge=0, le=3, description="Indice (0-3) da opcao correta.")
    explanation: str = Field(min_length=20, max_length=400, description="Explicacao pedagogica da resposta correta.")


class GameGenerationResult(BaseModel):
    name: str = Field(min_length=5, max_length=120, description="Titulo curto e atraente para o jogo.")
    # min_length=1 (nao 3): regeneracao granular de 1 pergunta (P3a REQ-5) reusa este schema pedindo
    # count=1 — a validacao de >=3 perguntas por jogo completo continua em GenerateGameRequest.count.
    questions: list[GameQuestion] = Field(min_length=1, max_length=10, description="Lista de questoes do jogo.")


class RewriteEvaluationResult(BaseModel):
    grade: Literal["S", "A", "B", "C", "Fraco"] = Field(description="Nota geral da reescrita; S e o teto.")
    tecnica: int = Field(ge=0, le=100, description="Correcao gramatical e adequacao a norma culta.")
    naturalidade: int = Field(ge=0, le=100, description="Fluidez e ausencia de tom artificial/robotico.")
    sofisticacao: int = Field(ge=0, le=100, description="Densidade lexical e maturidade da construcao.")
    precisao: int = Field(ge=0, le=100, description="Fidelidade ao sentido e ao criterio pedido.")
    feedback: str = Field(min_length=10, max_length=500, description="Comentario objetivo sobre o impacto da reescrita.")
    melhorias: list[str] = Field(default_factory=list, description="Ajustes concretos para subir de grade.")


class AnalyticsResult(BaseModel):
    summary: str
    estimated_level: str
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    recurrent_patterns: list[str] = Field(default_factory=list)
    next_focuses: list[str] = Field(default_factory=list)


class RecommendationResult(BaseModel):
    lessons: list[str] = Field(default_factory=list)
    games: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    difficulty: DifficultyLevel
    rationale: str


class StudyPlanDay(BaseModel):
    day: int = Field(ge=1)
    focus: str
    activities: list[str] = Field(min_length=1)
    minutes: int = Field(ge=10, le=180)
    expected_outcome: str


class StudyPlanResult(BaseModel):
    horizon_days: int = Field(ge=1, le=30)
    weekly_goal: str
    days: list[StudyPlanDay] = Field(min_length=1)
    review_strategy: str


# ── v2 Pipeline Internal Schemas ─────────────────────────────────────────────


class PreProcessorOutput(BaseModel):
    word_count: int
    paragraph_count: int
    has_minimum_structure: bool
    is_truncated: bool


class EliminationStatus(str):
    APPROVED = "APPROVED"
    TANGENCIAMENTO = "TANGENCIAMENTO"
    DESVIO_GRAVE = "DESVIO_GRAVE"
    ZERO = "ZERO"


ELIMINATION_STATUS_VALUES = {"APPROVED", "TANGENCIAMENTO", "DESVIO_GRAVE", "ZERO"}


class EliminationGateOutput(BaseModel):
    status: Literal["APPROVED", "TANGENCIAMENTO", "DESVIO_GRAVE", "ZERO"]
    reason: str
    zero_rule: str | None = None


class ThemeAnalysisV2(BaseModel):
    theme_alignment: int = Field(ge=0, le=100)
    tangenciamento: bool
    severity: Literal["low", "medium", "high"]
    evidence: str = ""


class ThesisAnalysisV2(BaseModel):
    thesis_present: bool
    thesis_text: str = ""
    clarity: Literal["clear", "vague", "absent"]
    is_generic: bool = False
    is_template: bool = False
    is_contradictory: bool = False
    sustained_throughout: bool = False
    score: int = Field(ge=0, le=100)


class RepertoireQuality(str):
    FORTE = "FORTE"
    ACEITAVEL = "ACEITAVEL"
    FRACO = "FRACO"
    INVALIDO = "INVALIDO"


class RepertoireAnalysisV2(BaseModel):
    quality: Literal["FORTE", "ACEITAVEL", "FRACO", "INVALIDO"]
    items_found: list[str] = Field(default_factory=list)
    is_generic: bool = False
    has_argumentative_connection: bool = False
    false_citations: bool = False
    score: int = Field(ge=0, le=100)


class ParagraphAnalysis(BaseModel):
    index: int = Field(ge=0)
    has_topic_sentence: bool
    development_score: int = Field(ge=0, le=100)
    issues: list[str] = Field(default_factory=list)
    sample_quote: str = ""


class ArgumentationAnalysisV2(BaseModel):
    paragraphs: list[ParagraphAnalysis] = Field(default_factory=list)
    overall_score: int = Field(ge=0, le=100)
    has_circular_reasoning: bool = False
    has_progression: bool = True
    filler_detected: bool = False


class InterventionElements(BaseModel):
    agente: bool = False
    acao: bool = False
    meio: bool = False
    finalidade: bool = False
    detalhamento: bool = False


class InterventionAnalysisV2(BaseModel):
    elements: InterventionElements = Field(default_factory=InterventionElements)
    completeness_score: int = Field(ge=0, le=100)
    is_generic: bool = False
    absent: bool = False
    has_human_rights_violation: bool = False
    sample_quote: str = ""


class GrammarSeverity(str):
    LEVE = "LEVE"
    MEDIA = "MEDIA"
    GRAVE = "GRAVE"


class GrammarErrorV2(BaseModel):
    category: str
    severity: Literal["LEVE", "MEDIA", "GRAVE"]
    count: int = Field(ge=0)


class GrammarAnalysisV2(BaseModel):
    errors: list[GrammarErrorV2] = Field(default_factory=list)
    orthography_score: int = Field(ge=0, le=100)
    cohesion_score: int = Field(ge=0, le=100)
    formality_score: int = Field(ge=0, le=100)
    grave_count: int = Field(ge=0, default=0)
    media_count: int = Field(ge=0, default=0)
    leve_count: int = Field(ge=0, default=0)


class PipelineAnalyses(BaseModel):
    preprocessor: PreProcessorOutput
    gate: EliminationGateOutput
    theme: ThemeAnalysisV2
    thesis: ThesisAnalysisV2
    repertoire: RepertoireAnalysisV2
    argumentation: ArgumentationAnalysisV2
    intervention: InterventionAnalysisV2
    grammar: GrammarAnalysisV2
